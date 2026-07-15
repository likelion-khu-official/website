# 멤버 인증 모듈 (`likelion.khu.website.member.auth`) — #117

`#97`(어드민 인증 파운데이션) 위에 **멤버(학번) 로그인 계층 하나를 얹는** 작업. 어드민의 로그인·JWT·쿠키·비밀번호 처리 로직은 그대로 재사용하고, `admins`/`refresh_tokens` 테이블과 어드민 로그인 흐름은 전혀 건드리지 않았다.

## Target / 정본 스펙

- 기능 트리: [`계정·인증`](../../pm/features/계정-인증.md) 및 하위 [로그인](../../pm/features/로그인.md)·[첫 로그인 비번 변경](../../pm/features/첫로그인-비번변경.md)·[비번 초기화](../../pm/features/비번-초기화.md)·[역할 4종](../../pm/features/역할-4종.md)
- 정식 스펙: [서비스 위키 — 정보구조와 권한](https://github.com/likelion-khu-official/website/wiki/정보구조와-권한)
- 미션 발주 원문: [이슈 #117](https://github.com/likelion-khu-official/website/issues/117)

## 구성 요소

| 파일 | 역할 |
|---|---|
| `member/Member.java` | 기존 프로필 엔티티(#76)에 로그인 필드 추가 — `studentId`(로그인 아이디)·`passwordHash`·`phone`(초기 비번 원본)·`mustChangePassword`·잠금 상태(`failedLoginAttempts`/`lockedUntil`, `Admin`과 동일 패턴) |
| `member/MemberRepository.java` | `findByStudentId`/`existsByStudentId` 추가 |
| `member/dto/MemberCreateRequest.java` | `studentId`·`phone` 추가 (기존 `POST /api/admin/members`, SUPER_ADMIN 전용, 그대로 재사용) |
| `member/MemberService.create()` | 전화번호를 BCrypt 해시해 초기 비밀번호로 저장, `mustChangePassword=true`로 시작. 학번 중복 시 409 |
| `member/auth/MemberRefreshToken(Repository)` | `admin.auth.RefreshToken`과 같은 shape, **별도 테이블**(`member_refresh_tokens`) — 이유는 아래 "설계 결정 1" |
| `member/auth/MemberCookieFactory` | `AdminCookieFactory`와 같은 쿠키(이름 `access_token`/`refresh_token`, HttpOnly+Secure+SameSite=Strict). `access_token`은 Path=`/`로 어드민과 동일하게 겹쳐 쓰고, `refresh_token`만 Path=`/api/member/auth`로 좁혀 어드민 refresh 흐름과 분리 |
| `member/auth/MemberAuthService` | login/logout/refresh/changePassword/resetPasswordByAdmin. `AdminAuthService`와 동일 구조(잠금 임계치도 `admin.lockout.*` 설정값 재사용) |
| `member/auth/MemberAuthController` | `POST /api/member/auth/{login,logout,refresh}`, `PATCH /api/member/auth/password` |
| `member/auth/MemberPasswordGuardFilter` | 첫 로그인 강제 변경 — 아래 "설계 결정 2" |
| `member/MemberController#resetPassword` | `POST /api/admin/members/{id}/password/reset` (ADMIN 이상) |
| `admin/auth/JwtProvider` | `Admin`/`Member` 양쪽을 받는 오버로드로 일반화 + `mcp`(mustChangePassword) 클레임 추가. 클레임 키 `email`은 이름과 달리 "로그인 식별자" 범용 클레임(어드민=이메일, 멤버=학번) — 필터·Principal을 그대로 재사용하려고 키 이름은 안 바꿨다 |
| `admin/auth/AdminPrincipal` | `mustChangePassword` 필드 추가(어드민 로그인은 항상 `false`) |
| `admin/auth/JwtAuthenticationFilter` | `mcp` 클레임을 읽어 `AdminPrincipal`에 채우도록 3줄 추가. 그 외 동작(쿠키 파싱·통과형 필터) 변화 없음 |
| `admin/exception/InvalidCredentialsException` | 메시지를 받는 생성자 오버로드 추가("이메일 또는" → 멤버는 "학번 또는") — 기존 무인자 생성자는 그대로 |

## 설계 결정과 이유

**1. `refresh_tokens`를 공유하지 않고 `member_refresh_tokens`를 새로 만든 이유**
어드민 `refresh()` 흐름은 `adminRepository.findById(...)`로 토큰 소유자를 재확인한다. 만약 테이블을 공유했다면 멤버 로그인에도 같은 컬럼(`adminId`)에 기대야 하는데, `Admin.id`와 `Member.id`는 서로 다른 시퀀스라 **같은 숫자 id가 우연히 겹칠 수 있다** — 최악의 경우 다른 사람의 refresh 토큰을 잘못 매칭할 여지가 생긴다. 이미 운영 중인 어드민 refresh 흐름을 손대는 리스크도 피하고 싶었다. 팀 개발 철학(`추상화는 두 번째 중복에서`)에도 맞게, 지금은 굳이 합치지 않고 나란히 둔 뒤 세 번째 유사 사례가 생기면 그때 공용화를 고려하는 게 낫다고 판단했다.

**2. 첫 로그인 강제 변경을 필터로 서버단에서 막은 이유**
Done에 "첫 로그인 때 비밀번호를 꼭 바꾸게 돼요"가 명시돼 있어, FE 안내만으로는 "꼭"이 보장되지 않는다고 판단했다(직접 API를 호출하면 우회 가능). `MemberPasswordGuardFilter`가 `JwtAuthenticationFilter` 뒤에서 `mustChangePassword=true`인 인증 사용자의 요청을 허용 경로(`/api/member/auth/password`·`logout`·`refresh`) 밖에서 403(`MUST_CHANGE_PASSWORD`)으로 막는다. 로그인 전 permitAll 경로는 인증 자체가 없어 전혀 영향받지 않는다.

**3. 비밀번호 변경 시 새 토큰 쌍을 즉시 재발급하는 이유 (구현 중 발견한 버그)**
처음엔 비번 변경 후 리프레시 토큰만 폐기했는데, **access 토큰은 발급 시점 클레임이 그대로 굳어 있어** DB의 `mustChangePassword`를 내려도 이미 나간 access 토큰엔 반영이 안 된다. 그 결과 방금 비번을 바꾼 사용자가 자기가 만든 가드 필터에 다시 걸려 새 비밀번호로도 아무것도 못 하는 상태가 됐다. `changePassword()`가 기존 세션(다른 기기 포함)을 전부 끊고, 방금 요청에는 `mcp=false`가 반영된 새 토큰 쌍을 바로 내려주도록 고쳤다 — 로그인을 다시 할 필요가 없다.

**4. 역할 4단을 `RoleHierarchy` 빔 없이 기존 `hasAnyRole(...)` 나열 방식 그대로 쓴 이유**
Spring Security `RoleHierarchy`로 "상위 역할이 하위 권한을 자동 포함"하게 만들 수도 있었지만, 지금 코드가 이미 `hasAnyRole('SUPER_ADMIN','ADMIN')`처럼 명시 나열 컨벤션이라 새 메커니즘을 안 들여오는 쪽을 골랐다. 리뷰어가 새 개념을 안 배워도 되고, 규모에 안 맞는 선제 추상화를 피한다(`kb/mindset.md`).

**5. 기존 회원 생성 API(`POST /api/admin/members`, SUPER_ADMIN)에 필드만 추가하고 새 등록 화면·API를 안 만든 이유**
이슈 Notes가 "관리자가 멤버 계정을 등록·발급하는 화면은 이번엔 안 하셔도 돼요 — 다음 미션에서"라고 명시했다. 그런데 로그인 기능이 동작하려면 학번·전화번호를 가진 계정이 최소한 하나는 있어야 검증 가능하다. 그래서 새 화면·새 API를 만드는 대신, 이미 있는 멤버 생성 API에 `studentId`·`phone` 필드 두 개만 추가해 초기 비밀번호를 서버가 자동으로 세팅하게 했다 — Notes가 막은 "새 등록 화면/관리 UI"는 만들지 않으면서 로그인이 실제로 동작하게 하는 최소 확장.

**6. 비번 초기화를 SUPER_ADMIN이 아니라 ADMIN 이상으로 연 이유**
`역할-4종.md`가 "관리자 — + 멤버 등록·비번 초기화·..."라고 명시해, 기존 멤버 생성/수정 API(SUPER_ADMIN 전용, #76에서 이미 그렇게 정해짐)와 달리 비번 초기화는 ADMIN도 가능한 걸로 새로 만들었다. 기존 생성/수정 API의 SUPER_ADMIN 제약 자체는 이번 미션 범위가 아니라 손대지 않았다.

**7. (불확실 — 리뷰 시 확인 필요) "최고관리자 딱 1명" vs 코드의 "최소 1명"**
`역할-4종.md`엔 최고관리자가 "딱 1명"이라 적혀 있지만, 실제 코드(#97)는 "최소 1명"(현재 선우님·시현님 둘 다 SUPER_ADMIN) 불변식이다. 이번 미션 Notes가 "지금 있는 개념과 자연스럽게 이어져요"라고 해서, **기존 코드의 "최소 1명" 불변식은 그대로 두고 문서 표현 차이는 건드리지 않았다.** 이 미션 Done에 없는 범위라 별도 확인·조정이 필요하면 ask-pm으로 올릴 사안.

## 재사용 vs 신규 — 한눈에

| 그대로 재사용 | 새로 만듦(별도) |
|---|---|
| `AdminPasswordPolicy`(8자+영문+숫자) | `MemberRefreshToken`/`Repository`(테이블 분리, 이유는 결정 1) |
| BCrypt(`PasswordEncoder`) | `MemberCookieFactory`(refresh Path만 다름) |
| `admin.lockout.*` 설정값(잠금 임계치) | `MemberAuthService`/`Controller` |
| `GlobalExceptionHandler`의 기존 예외 핸들러(`INVALID_CREDENTIALS`·`ACCOUNT_LOCKED`·`WEAK_PASSWORD` 등, 클래스 재사용이라 별도 등록 불필요) | `MemberPasswordGuardFilter`(신규 요구사항) |
| `JwtProvider`/`JwtAuthenticationFilter`/`AdminPrincipal`(일반화만) | `admin/members/{id}/password/reset` 엔드포인트 |

## 테스트 커버리지

`member`·`member/auth` 패키지 전체 43개 테스트(전체 스위트 186개, 회귀 0):

- **`MemberAuthControllerTest`**(신규) — 로그인 성공/실패/5회 잠금, 로그아웃 후 리프레시 실패, 리프레시 갱신, **첫 로그인 강제 변경 종단 시나리오**(변경 전 차단 → 변경 → 새 토큰으로 통과 → 구비번 로그인 불가), **관리자 초기화 종단 시나리오**(초기화 → 전화번호로 재로그인 + 강제변경 재진입 → 바꿨던 비번 무효화), 미인증 401.
- **`MemberControllerTest`**(확장) — 학번 누락 400, 학번 중복 409, 비번 초기화 API의 ADMIN 허용/MEMBER 거부/미인증/존재하지않는id 404.
- **`MemberServiceTest`**(확장) — 초기 비밀번호가 전화번호의 BCrypt 해시인지, `mustChangePassword`가 `true`로 시작하는지, 학번 중복 시 예외.
- 어드민 쪽 회귀: `AdminAuthControllerTest` 등 기존 스위트 전부 그대로 통과 — `AdminPrincipal`에 필드가 추가됐지만 어드민 로그인 경로의 응답·쿠키·권한 동작은 바뀌지 않았다.

## 아직 못 메꾼 것 (다음 미션 후보)

- 관리자가 멤버 계정을 대량 등록/발급하는 전용 화면·API(Notes에서 명시적으로 이번 범위 제외)
- "최고관리자 딱 1명" vs "최소 1명" 스펙-코드 불일치 (위 결정 7)
- 어드민 모듈과 동일하게 IP 기반 요청 제한(429)·refresh 토큰 로테이션 없음 — `admin-auth-module.md`에 이미 기록된 동일한 트레이드오프를 멤버 쪽도 그대로 상속
