# 어드민 인증·초대 모듈 (`likelion.khu.website.admin`)

이메일 로그인, 초대(72시간), 비밀번호 재설정(30분), 계정 잠금, 관리자 목록·삭제를 제공한다. 관리자 권한은 `ADMIN` 하나이며 모든 관리자가 같은 기능을 쓴다. 마지막 관리자 삭제만 409 `LAST_ADMIN`으로 막아 운영 계정이 0명이 되는 상태를 방지한다.

## 구성 요소

| 파일 | 역할 |
|---|---|
| `Admin.java` | `admins` 테이블. 이메일·비밀번호 해시·이름·잠금 상태 저장 |
| `AdminRepository.java` | 이메일 조회·존재 확인 |
| `AdminPasswordPolicy.java` | 최소 8자 + 영문·숫자 각 1개. 초대 수락·재설정 공용 |
| `auth/JwtProvider.java` | 관리자 토큰에 `ADMIN`, 멤버 토큰에 `MEMBER` authority 발급 |
| `auth/AdminPrincipal.java` | 로그인 주체의 id·로그인 식별자·authority |
| `auth/JwtAuthenticationFilter.java` | access 쿠키 검증 후 `SecurityContext` 구성 |
| `auth/AdminCookieFactory.java` | access·refresh HttpOnly 쿠키 생성·삭제 |
| `auth/RefreshToken.java` | 폐기 가능한 refresh 토큰 해시 저장 |
| `auth/AdminAuthService.java` / `Controller.java` | 로그인·로그아웃·refresh |
| `invitation/*` | 관리자 초대 등록·목록·취소·검증·수락 |
| `password/*` | 본인 이메일 기반 비밀번호 재설정 |
| `management/*` | 관리자 목록·삭제와 마지막 관리자 보호 |
| `seed/AdminSeedRunner.java` | 최초 관리자 시드. 없는 계정만 생성하는 멱등 러너 |
| `seed/E2eAdminSeedRunner.java` | `e2e` 프로필에서만 고정 비밀번호 관리자 2명 시드 |

## 인증 흐름

1. 로그인 성공 시 `access_token`(15분, Path `/`)과 `refresh_token`(7일, Path `/api/admin/auth`)을 HttpOnly·Secure·SameSite=Strict 쿠키로 내린다. JSON 바디에는 토큰을 넣지 않는다.
2. `JwtAuthenticationFilter`는 access 쿠키를 검증하고 `AdminPrincipal`과 `ROLE_ADMIN`을 `SecurityContext`에 넣는다.
3. 쿠키가 없거나 무효면 필터는 인증 없이 통과시킨다. 공개 경로는 계속 동작하고, 보호 경로는 이후 Spring Security가 401로 막는다.
4. refresh 원문은 저장하지 않고 SHA-256 해시만 DB에 둔다. 로그아웃·비밀번호 재설정·계정 삭제 때 폐기한다.

멤버 인증도 같은 JWT·필터 기반을 재사용하지만 `ROLE_MEMBER`와 학번 식별자를 쓴다. 관리자와 멤버는 계정 저장소와 권한이 분리돼 있어 관리자 계정으로 멤버 자기 콘텐츠 API를 사용할 수 없다.

## 초대와 계정 유지

- 모든 관리자는 `POST /api/admin/invitations`로 khu.ac.kr 이메일을 초대할 수 있다.
- 초대받은 사람은 토큰 링크에서 이름과 비밀번호를 정해 관리자 계정을 만든다.
- 초대는 `PENDING → ACCEPTED` 또는 `PENDING → CANCELLED`로 전이한다. `EXPIRED`는 저장 상태가 아니라 만료 시각으로 파생한다.
- 모든 관리자는 관리자 목록을 보고 계정을 삭제할 수 있다.
- 전체 관리자 수가 1명이면 삭제를 거부한다. 역할별 최소 인원이 아니라 관리자 총원 불변식이다.

## 새 관리자 기능을 붙이는 법

컨트롤러 메서드에 다음처럼 단일 권한을 건다.

```java
@PreAuthorize("hasRole('ADMIN')")
```

- `SecurityConfig`에서 새 경로가 `permitAll()`이 아니면 기본 `authenticated()`가 먼저 로그인 여부를 확인한다.
- 초대 수락·비밀번호 재설정처럼 로그인 전에 필요한 경로만 명시적으로 공개한다.
- 로그인한 관리자 정보는 `@AuthenticationPrincipal AdminPrincipal principal`로 받는다.
- 테스트는 `@WithMockAdminUser` 또는 `@WithMockUser(roles = "ADMIN")`을 사용한다.
- 인증 없음 401, 멤버 계정 403, 관리자 성공을 각각 확인한다. 더 이상 관리자 내부 역할별 분기는 만들지 않는다.

## 최초 관리자 시드

현재 `admin.seed.admins`(env `ADMIN_SEED_ADMINS`, `email:name,email2:name2`)를 앱 기동 때 읽는다. 여기서 만들어지는 계정도 다른 관리자와 같은 `ADMIN` 권한이다. 없는 계정만 무작위 폐기용 비밀번호로 만든 뒤 본인에게 재설정 메일을 보내므로, 초기 비밀번호를 전달하는 경로가 없다.

실제 이메일은 public 저장소의 파일에 쓰지 않고 각 환경의 gitignore된 설정에서만 주입한다. 옛 이름 `admin.seed.super-admins`(env `ADMIN_SEED_SUPER_ADMINS`)를 아직 쓰는 stage/prod `.env`도 계속 동작하도록, `application.yml`이 새 이름이 비어 있을 때만 옛 이름을 fallback으로 읽는다(#297) — 재배포 없이도 안 깨지고, 다음 `.env` 정리 때 새 이름으로 옮기면 된다.

## e2e 관리자

HttpOnly 쿠키는 JavaScript로 주입할 수 없어 Playwright가 실제 로그인할 고정 비밀번호 계정이 필요하다. `E2eAdminSeedRunner`는 `SPRING_PROFILES_ACTIVE=e2e`에서만 관리자 2명(`admin.e2e-seed.first-admin-*`/`second-admin-*`, env `ADMIN_E2E_FIRST_ADMIN_*`/`ADMIN_E2E_SECOND_ADMIN_*`)을 만든다. 두 계정의 실제 권한은 같고, 이름도 최고/일반이 아니라 첫 번째/두 번째로 중립적으로 표현한다(#297) — 다만 계정 자체의 이메일·비밀번호 값은 이미 다른 곳에서 참조할 수 있어 그대로 유지했다. 옛 이름 `ADMIN_E2E_SUPER_ADMIN_*`/`ADMIN_E2E_ADMIN_*`도 fallback으로 계속 읽힌다. 두 계정은 한 관리자가 다른 관리자를 삭제하는 흐름과 마지막 관리자 보호를 검증하기 위해 필요하다.

stage·prod에서는 `e2e` 프로필과 `ADMIN_E2E_*` 값을 절대 사용하지 않는다.

## 보안 불변식

- 비밀번호·refresh 토큰 원문을 DB에 저장하지 않는다.
- 로그인 실패 메시지는 계정 존재 여부를 구분하지 않는다.
- 5회 실패 시 기본 15분 잠금, 성공 시 실패 횟수 초기화.
- forgot-password 응답은 계정 존재 여부와 무관하게 동일하다.
- 초대·재설정 토큰은 1회용이며 만료 후 거부한다.
- 관리자 삭제 전 refresh 토큰을 모두 폐기한다.
- 마지막 관리자 삭제를 막아 운영 계정이 0명이 되지 않게 한다.
