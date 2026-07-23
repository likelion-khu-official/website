# 어드민 인증·초대 모듈 (`likelion.khu.website.admin`)

`#75`(메일 발송 기반)·`#85`(이메일 모듈) 위에서, `#74`/`#90`("어드민 파운데이션")의 실제 구현. 이메일=아이디 로그인, 초대(72h)·비밀번호재설정(30분) 메일 링크 플로우, `SUPER_ADMIN`/`ADMIN` 2단 역할, 계정 단위 무차별대입 방어(423), 최소 1명 SUPER_ADMIN 불변식을 갖춘다. **이 문서는 이번 미션에서 가장 중요한 산출물**로 지정된 "다음 사람을 위한 안내서"다 — 특히 4번 절이 핵심.

## 구성 요소

| 파일 | 역할 |
|---|---|
| `Admin.java` | `admins` 테이블 — 이메일=아이디, `passwordHash`, `role`, 잠금 상태(`failedLoginAttempts`/`lockedUntil`) |
| `AdminRole.java` | `SUPER_ADMIN`, `ADMIN` |
| `AdminRepository.java` | `findByEmail`, `existsByEmail`, `countByRole` |
| `AdminPasswordPolicy.java` | 최소 8자+영문·숫자 각 1개 이상 — invite-accept/reset 공용 검증 |
| `dto/AdminAccountResponse`, `AdminSessionResponse`, `AdminSuccessResponse` | 여러 엔드포인트가 공유하는 응답 shape |
| `exception/*` | 13개, `GlobalExceptionHandler`가 전부 처리(모듈 경계는 하위 패키지 아니라 `admin` 전체) |
| `auth/JwtProvider.java` | HS256 서명·검증, `typ` 클레임으로 access/refresh 구분 |
| `auth/AdminPrincipal.java` | `@AuthenticationPrincipal`로 꺼내는 로그인 주체(id/email/role) |
| `auth/JwtAuthenticationFilter.java` | `access_token` 쿠키만 읽는 순수 통과형 필터 — 실패해도 예외 없이 그냥 진행 |
| `auth/AdminCookieFactory.java` | access/refresh 쿠키 생성 + 로그아웃용 clear 버전 |
| `auth/RefreshToken.java`/`RefreshTokenRepository.java` | 해시만 저장하는 refresh 토큰 저장소(폐기 능력용) |
| `auth/AdminAuthService.java`/`AdminAuthController.java` | 로그인/로그아웃/리프레시 |
| `invitation/AdminInvitation.java`/`InvitationStatus.java` | PENDING/ACCEPTED/CANCELLED — EXPIRED는 파생 |
| `invitation/AdminInvitationService.java`/`Controller.java` | 초대 등록/목록/취소/검증/수락 |
| `password/PasswordResetToken.java` | `MagicLinkToken`과 동일 shape(token/expiresAt/used) |
| `password/AdminPasswordResetService.java`/`Controller.java` | forgot/verify/reset |
| `management/AdminManagementService.java`/`Controller.java` | 운영진 목록/삭제/역할변경, 마지막 SUPER_ADMIN 가드 |
| `seed/AdminSeedRunner.java` | 최초 SUPER_ADMIN 시딩(env 기반, 멱등) |

## 핵심 개념 3가지

**1. 로그인 → 쿠키 발급 → 필터 → SecurityContext.** 로그인 성공 시 `access_token`(15분, Path=`/`)·`refresh_token`(7일, Path=`/api/admin/auth`) 두 개의 HttpOnly+Secure+SameSite=Strict 쿠키를 `Set-Cookie`로 내려준다(JSON 바디엔 토큰이 없다). 이후 요청마다 `JwtAuthenticationFilter`가 `access_token` 쿠키만 읽어 검증하고, 유효하면 `SecurityContextHolder`에 `AdminPrincipal` + `ROLE_`-접두 권한을 채운다. 쿠키가 없거나 무효해도 필터는 예외 없이 그냥 통과시킨다 — 그래서 기존 `permitAll()` 경로(헬스체크 등)가 이 필터 추가로 전혀 영향받지 않는다.

**2. 초대 토큰 생명주기.** `AdminInvitation`은 `PENDING → ACCEPTED`(수락) 또는 `PENDING → CANCELLED`(취소)로만 전이한다(`markAccepted`/`markCancelled`가 PENDING 아니면 `IllegalStateException`으로 막음). `EXPIRED`는 저장되는 상태가 아니라, 목록 조회 시 `PENDING`이면서 `isExpired()`인 경우에만 응답에서 파생시킨다.

**3. 재설정 토큰 생명주기.** `PasswordResetToken`은 `MagicLinkToken`과 거의 동일한 shape(단일 `used` 플래그, `isExpired()`) — 1회용, 만료 30분.

## 다음 관리 기능을 이 기반 위에 붙이는 법

새 어드민 전용 엔드포인트를 추가할 때 순서:

1. **컨트롤러 메서드에 `@PreAuthorize` 를 단다.** 예:
   ```java
   @PreAuthorize("hasRole('SUPER_ADMIN')")          // 최고관리자만
   @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')") // 운영진 전체
   ```
   `@EnableMethodSecurity`가 이미 `SecurityConfig`에 켜져 있어 별도 설정 없이 바로 동작한다.
2. **`SecurityConfig`의 `authorizeHttpRequests`를 확인한다.** 새 경로가 `permitAll()` 목록에 없으면 기본값(`anyRequest().authenticated()`)에 걸려 자동으로 "로그인은 필요, 세부 권한은 `@PreAuthorize`가 결정" 상태가 된다 — 대부분의 신규 어드민 API는 이 상태로 충분하고 아무것도 추가할 필요 없다. `permitAll()`을 추가해야 하는 경우는 "로그인 전에도 접근해야 하는 특수 케이스"(초대 수락, 비번 재설정처럼)뿐이다.
3. **로그인한 운영진 정보가 필요하면** `@AuthenticationPrincipal AdminPrincipal principal`을 컨트롤러 파라미터로 받는다(`principal.getId()`/`getEmail()`/`getRole()`).
4. **테스트는 `@WithMockUser(roles = "SUPER_ADMIN")`(또는 `"ADMIN"`)로 시뮬레이션한다** — `spring-security-test`가 이미 테스트 의존성에 있다. 권한 없는 역할로 호출해 403이 나는 것, 쿠키 없이 호출해 401이 나는 것 둘 다 반드시 확인한다.

## 역할 체크 동작 원리

Spring Security의 `hasRole("X")`는 내부적으로 `"ROLE_X"` 권한을 찾는다. `JwtAuthenticationFilter`가 `SimpleGrantedAuthority("ROLE_" + role)`로 채우기 때문에, JWT의 `role` 클레임 값(`"SUPER_ADMIN"`/`"ADMIN"`)과 `hasRole(...)`에 넘기는 문자열이 항상 접두어 없이 일치해야 한다. `SessionCreationPolicy.STATELESS`라 이 권한은 요청마다 매번 JWT에서 새로 만들어지고 서버에 세션으로 남지 않는다.

## 토큰이 어디 있는지

| | `access_token` | `refresh_token` |
|---|---|---|
| 위치 | HttpOnly 쿠키 | HttpOnly 쿠키 |
| Path | `/` | `/api/admin/auth` |
| 수명 | 15분(`jwt.access-expiration`) | 7일(`jwt.refresh-expiration`) |
| 서버 저장 | 안 함(스테이트리스) | `refresh_tokens` 테이블에 **SHA-256 해시만** |

refresh 토큰 자체는 서명된 JWT라 매번 DB 조회 없이도 검증 가능하지만, 로그아웃/비번재설정/역할변경/제거 시 "폐기"가 필요해서 해시만 별도 저장해둔다(원문을 저장하지 않아 DB 유출 시에도 직접 재생 불가). **재사용 로테이션은 없다** — 같은 refresh 토큰을 만료(7일)까지 재사용, 명시적 revoke 전까진 유효.

## 시드 데이터

`admin.seed.super-admins`(env `ADMIN_SEED_SUPER_ADMINS`, 포맷 `email:name,email2:name2`)에 있는 각 항목을 앱 기동 시 확인해, 없는 계정만 SUPER_ADMIN으로 생성하고 곧바로 비밀번호 재설정 메일을 보낸다(`AdminSeedRunner`). 재시작·재배포해도 이미 있는 계정은 건드리지 않는다(멱등). **실제 이메일은 이 값을 담는 어떤 소스 파일에도 커밋하지 않고** 각 환경의 gitignore된 `.env.stage`/`.env.prod`에서만 주입한다.

## 아직 못 메꾼 빈틈

| 항목 | 이유 |
|---|---|
| IP 기반 요청 제한(429) | 계정 단위 잠금(423)만 구현 — 신규 인프라(Redis/bucket4j 등) 없이는 이번 범위에서 오버엔지니어링으로 판단 |
| Refresh 토큰 재사용 로테이션·탈취 재사용 탐지 | 같은 토큰을 만료까지 재사용 — 작은 규모 어드민 도구에서 수용 가능한 트레이드오프 |
| 만료/폐기 토큰 행 정리 스케줄러 | 이 규모에선 무관, 트래픽이 늘면 재판단 |
| 스테이트리스 access 토큰 즉시 무효화 | 제거/역할변경/비번재설정은 refresh만 끊음 — 이미 나간 access 토큰은 최대 15분 잔여 유효(구조적 트레이드오프) |
| CSRF 토큰 없음 | `SameSite=Strict`에만 의존 — 이 어드민 패널을 크로스사이트 top-level 내비게이션으로 열 시나리오가 없어 수용 |
| forgot-password 완전한 상수시간 아님 | 응답 바디는 동일하지만 DB조회+메일발송 유무로 지연 미세 차이 — 낮은 리스크로 수용 |
| 로그인 상태 자가 비밀번호 변경 없음 | forgot/reset 메일 경유만 존재 — 자연스러운 다음 기능 |
| 재초대 시 기존 PENDING 자동 대체 | 스펙 명시 아닌 해석(멱등 재발송) — PM/FE 확인 필요 |
| FE 라우트 경로(`/admin/invite/{token}` 등) | placeholder — FE 라우트 확정 후 `app.frontend-base-url` 기준 링크 형태 재확인 필요 |
| `SameSite=Strict` 전제 | FE·BE가 같은 등록가능도메인(eTLD+1) 공유를 전제 — 다르면 쿠키 인증 자체가 안 됨, 인프라 확인 필요 |
| 등록 이메일 자체를 잊은 관리자의 복구 경로 (#136) | **해결됨, 코드 변경 없음** — `GET /api/admin/admins`(ADMIN 이상 접근 가능, email 노출)로 동료 관리자에게 물어 확인 가능. 정책 전문은 위키 [`정보구조와-권한`](https://github.com/likelion-khu-official/website/wiki/정보구조와-권한) "계정 복구 정책" 참고 |
| SUPER_ADMIN 승계("넘기기") 기능 없음 (#142) | 위키/기능트리 스펙은 최고관리자에게 승급/강등 개념을 노출하지 않고 "넘기기" 하나의 동작만 보여주는 것 — 지금은 이 기능 자체가 대시보드에 없음(기존 역할변경 드롭다운은 본인 행에 안 뜸). FE 이슈로 별도 발주, 이 문서와 무관하게 FE 쪽에서 해결 |

## 코드 리뷰 진행 상황

- [ ] `Admin.java`/`AdminRole.java` — 잠금 상태 전이, 마지막 SUPER_ADMIN 불변식을 엔티티가 아니라 서비스가 가드하는 이유
- [ ] `auth/JwtProvider.java`/`JwtAuthenticationFilter.java` — HS256 선택 근거, `typ` 클레임 방어, 필터가 항상 통과시키는 이유
- [ ] `auth/AdminCookieFactory.java`/`RefreshToken.java` — 쿠키 속성, 해시만 저장하는 이유
- [ ] `invitation/*`, `password/*` — 토큰 생명주기, `MagicLinkToken`과의 공통점/차이점
- [ ] `management/AdminManagementService.java` — 마지막 SUPER_ADMIN 가드 로직
- [ ] `config/SecurityConfig.java` — matcher 구성, `exceptionHandling`이 `GlobalExceptionHandler`와 분리된 이유
- [ ] `seed/AdminSeedRunner.java` — 멱등 시딩, "가입+비번재설정메일" 온보딩
- [ ] 테스트 전체(`AdminAuthControllerTest` 등) — `@WithMockUser` 사용법, 회귀 테스트(`/api/admin/posts/**` 401 전환)
