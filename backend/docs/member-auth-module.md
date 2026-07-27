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
| `member/dto/MemberCreateRequest.java` | `studentId`·`phone` 추가 (기존 `POST /api/admin/members`, 그대로 재사용 — 권한은 당시 SUPER_ADMIN 전용이었으나 #145에서 ADMIN 이상으로 정정됨, 아래 "설계 결정 6" 참고) |
| `member/MemberService.create()` | 전화번호를 BCrypt 해시해 초기 비밀번호로 저장, `mustChangePassword=true`로 시작. 학번 중복 시 409 |
| `member/auth/MemberRefreshToken(Repository)` | `admin.auth.RefreshToken`과 같은 shape, **별도 테이블**(`member_refresh_tokens`) — 이유는 아래 "설계 결정 1" |
| `member/auth/MemberCookieFactory` | `AdminCookieFactory`와 같은 쿠키(이름 `access_token`/`refresh_token`, HttpOnly+Secure+SameSite=Strict). `access_token`은 Path=`/`로 어드민과 동일하게 겹쳐 쓰고, `refresh_token`만 Path=`/api/member/auth`로 좁혀 어드민 refresh 흐름과 분리 |
| `member/auth/MemberAuthService` | login/logout/refresh/changePassword(currentPassword 검증 포함)/resetPasswordByAdmin. `AdminAuthService`와 동일 구조(잠금 임계치도 `admin.lockout.*` 설정값 재사용) |
| `member/auth/MemberAuthController` | `POST /api/member/auth/{login,logout,refresh}`, `PATCH /api/member/auth/password` |
| `member/auth/MemberPasswordGuardFilter` | 첫 로그인 강제 변경, `/api/member/` 네임스페이스에만 적용 — 아래 "설계 결정 2·11" |
| `member/MemberController#resetPassword` | `POST /api/admin/members/{id}/password/reset` (ADMIN 이상) |
| `member/exception/MemberNotFoundException` | changePassword/resetPasswordByAdmin의 404 — 아래 "설계 결정 8" |
| `feed/post/PostController` | `adminList`/`updateStatus`에 `@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")` 추가 — 아래 "설계 결정 9" |
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

> **(2026-07-23 정정, #145)** 위 문단의 "SUPER_ADMIN 전용" 판단 자체가 애초에 `역할-4종.md`·서비스 위키 [정보구조와 권한](https://github.com/likelion-khu-official/website/wiki/정보구조와-권한)과 어긋나 있었다 — 두 문서 다 멤버 등록·수정도 ADMIN 이상 공용 권한이라 명시한다. #145에서 이 제약을 손대지 않기로 한 스코프 판단은 유효했지만, 판단의 근거였던 "SUPER_ADMIN 전용이 맞다"는 전제가 틀렸던 것 — #145가 `MemberController.create/update`를 `hasAnyRole('ADMIN','SUPER_ADMIN')`로 정정했다.

**7. (불확실 — 리뷰 시 확인 필요) "최고관리자 딱 1명" vs 코드의 "최소 1명"**
`역할-4종.md`엔 최고관리자가 "딱 1명"이라 적혀 있지만, 실제 코드(#97)는 "최소 1명"(현재 선우님·시현님 둘 다 SUPER_ADMIN) 불변식이다. 이번 미션 Notes가 "지금 있는 개념과 자연스럽게 이어져요"라고 해서, **기존 코드의 "최소 1명" 불변식은 그대로 두고 문서 표현 차이는 건드리지 않았다.** 이 미션 Done에 없는 범위라 별도 확인·조정이 필요하면 ask-pm으로 올릴 사안.

**8. (자체 리뷰에서 발견 — 수정) changePassword/resetPasswordByAdmin의 404를 커스텀 예외로 뺀 이유**
처음엔 `ResponseStatusException(HttpStatus.NOT_FOUND, ...)`을 바로 던졌는데, `GlobalExceptionHandler`엔 이걸 잡는 핸들러가 없어(커스텀 예외 클래스만 등록됨) Spring 기본 에러 바디(`{timestamp,status,error,path}`)가 나가고, 정작 이 미션이 `shared/types/member-auth.ts`에 문서화한 `{success,message,code:'NOT_FOUND'}` 계약을 못 지켰다. `admin.exception.AdminNotFoundException`과 같은 패턴으로 `member.exception.MemberNotFoundException`을 새로 만들고 `GlobalExceptionHandler`에 핸들러를 등록해 계약을 맞췄다.

**9. (자체 리뷰에서 발견 — 수정) `changePassword`에 currentPassword 검증을 추가한 이유**
원래는 `newPassword`만 받았는데, 로그인된 기기를 잠깐 빌린 제3자가 현재 비밀번호를 몰라도 새 비번으로 계정을 영구 탈취할 수 있는 구멍이었다. `currentPassword`를 필수로 받아 `passwordEncoder.matches()`로 검증하도록 고쳤다. 첫 로그인 강제 변경 흐름에서도 FE가 사용자에게 다시 물을 필요는 없다 — 로그인 폼에 입력받은 값(초기값=전화번호)을 그대로 `currentPassword`에 실어 보내면 되므로, 사용자 눈엔 "새 비밀번호" 입력창 하나만 보인다.

**10. (자체 리뷰에서 발견 — 수정) `PostController`의 어드민 엔드포인트에 `@PreAuthorize`를 추가한 이유**
`SecurityConfig`의 `/api/admin/posts/**` matcher는 `.authenticated()`까지만 걸려 있다 — "인증된 사람 = 운영진"이라는, MEMBER 로그인이 없던 시절엔 맞았던 암묵적 전제 위에 있었다. 이번 미션이 MEMBER라는 **어드민이 아닌 첫 인증 주체**를 도입하면서 그 전제가 깨져, 첫 로그인 비번변경만 마친 일반 부원이 `GET /api/admin/posts`로 draft/hidden 글을 전부 보고 `PATCH /api/admin/posts/{id}/status`로 아무 글이나 숨기거나 게시할 수 있는 상태가 됐다(위키 역할표상 "문제 글 숨김"은 관리자 전용). `MemberController`의 `/api/admin/members/*`처럼, URL 접두사(`/admin/`)는 정리용 관례일 뿐 보안 경계가 아니라서 `@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")`를 컨트롤러에 직접 달아야 했다. `CommentController`의 `/admin/{commentId}/hide`는 애초에 `permitAll()`(별도 TODO, 이번 미션 이전부터 있던 미인증 상태)이라 이 취약점과는 무관 — 손대지 않았다.

**11. (자체 리뷰에서 발견 — 수정, 이후 재수정) `MemberPasswordGuardFilter`의 차단 범위 — 경로 목록에서 "쓰기 메서드인가"로 일반화**
이 필터는 `SecurityFilterChain`에 무조건 등록돼 `permitAll()` 여부와 무관하게 모든 요청에서 실행된다. 원래 구현은 허용 목록(`ALLOWED_PATHS`) 3개 밖의 **모든** 경로를 막았는데, 그러면 `GET /api/posts`(공개 피드)·`GET /api/members`(공개 로스터) 같은 완전 공개 API까지 403(MUST_CHANGE_PASSWORD)이 나서, 막 로그인한 신규 멤버가 익명 방문자도 보는 콘텐츠조차 못 보는 문제가 있었다. 그래서 1차로 `/api/member/`(멤버 네임스페이스) 안에서만 막도록 좁혔다.

그런데 이 1차 수정도 부족했다 — **#119(프로젝트 쇼케이스) 리뷰에서 `/api/projects`(POST/PATCH/DELETE, 명백한 멤버 전용 쓰기 API)가 `/api/member/` 밖이라 가드가 전혀 안 걸린다는 게 드러났다.** 리드미 기능 트리(`멤버 영역` — 글쓰기·내프로필편집·내프로젝트 등)를 보면 앞으로도 `/api/member/` 밖에 멤버 전용 쓰기 API가 계속 생길 걸 알 수 있어서, 경로를 나열하는 접근 자체가 구조적으로 매번 같은 구멍을 반복한다고 판단했다. 그래서 축을 아예 바꿨다: **"쓰기 메서드(POST/PUT/PATCH/DELETE)인가"**로 판단한다. 읽기(GET)는 애초에 막을 이유가 없었던 거라 전부 통과시키고, 쓰기는 경로가 뭐든(`/api/member/`든 `/api/projects`든 앞으로 생길 무엇이든) 자동으로 걸린다. 유일한 예외는 `/api/member/auth/**`(로그인·로그아웃·리프레시·비번변경, 인증 모듈 자기 자신) — 안 열어두면 비번을 바꾸러 가는 요청 자체가 막힌다.

부수 효과: `/api/admin/posts/**`처럼 멤버에게 원래 권한이 없는(role 체크로 어차피 막히는) 쓰기 엔드포인트도 이제 role 체크보다 가드가 먼저 걸린다 — 결과(403)는 같지만 이유(코드)가 `FORBIDDEN`에서 `MUST_CHANGE_PASSWORD`로 바뀐다(`PostControllerTest.updateStatus_MemberMustChangePassword_Returns403ViaGuardBeforeRoleCheck` 참고). "비번 안 바꾼 멤버는 어떤 쓰기 행동도 못 한다"가 더 단순하고 일관된 규칙이라 이 우선순위를 그대로 받아들였다.

## 재사용 vs 신규 — 한눈에

| 그대로 재사용 | 새로 만듦(별도) |
|---|---|
| `AdminPasswordPolicy`(8자+영문+숫자) | `MemberRefreshToken`/`Repository`(테이블 분리, 이유는 결정 1) |
| BCrypt(`PasswordEncoder`) | `MemberCookieFactory`(refresh Path만 다름) |
| `admin.lockout.*` 설정값(잠금 임계치) | `MemberAuthService`/`Controller` |
| `GlobalExceptionHandler`의 기존 예외 핸들러(`INVALID_CREDENTIALS`·`ACCOUNT_LOCKED`·`WEAK_PASSWORD` 등, 클래스 재사용이라 별도 등록 불필요) | `MemberPasswordGuardFilter`(신규 요구사항) |
| `JwtProvider`/`JwtAuthenticationFilter`/`AdminPrincipal`(일반화만) | `admin/members/{id}/password/reset` 엔드포인트 |
| | `member/exception/MemberNotFoundException` + `GlobalExceptionHandler` 핸들러 1개(신규 등록, 결정 8) |

## 테스트 커버리지

`member`·`member/auth` 패키지 + `PostControllerTest` 어드민 권한 테스트, 회귀 0:

- **`MemberAuthControllerTest`**(신규) — 로그인 성공/실패/5회 잠금, 로그아웃 후 리프레시 실패, 리프레시 갱신, **첫 로그인 강제 변경 종단 시나리오**(변경 전 차단 → 변경 → 새 토큰으로 통과 → 구비번 로그인 불가), **currentPassword 불일치 시 401 + 비번 안 바뀜**(결정 9), **관리자 초기화 종단 시나리오**(초기화 → 전화번호로 재로그인 + 강제변경 재진입 → 바꿨던 비번 무효화), 미인증 401.
- **`MemberControllerTest`**(확장) — 학번 누락 400, 학번 중복 409, 비번 초기화 API의 ADMIN 허용/MEMBER 거부/미인증/존재하지않는id 404(+ `{success,code:'NOT_FOUND'}` 바디 검증, 결정 8).
- **`MemberServiceTest`**(확장) — 초기 비밀번호가 전화번호의 BCrypt 해시인지, `mustChangePassword`가 `true`로 시작하는지, 학번 중복 시 예외.
- **`PostControllerTest`**(확장, 결정 10) — `/api/admin/posts` GET·`PATCH .../status`에 SUPER_ADMIN 허용/MEMBER 거부(403) 케이스 추가.
- 어드민 쪽 회귀: `AdminAuthControllerTest` 등 기존 스위트 전부 그대로 통과 — `AdminPrincipal`에 필드가 추가됐지만 어드민 로그인 경로의 응답·쿠키·권한 동작은 바뀌지 않았다.

## 아직 못 메꾼 것 (다음 미션 후보)

- 관리자가 멤버 계정을 대량 등록/발급하는 전용 화면·API(Notes에서 명시적으로 이번 범위 제외)
- "최고관리자 딱 1명" vs "최소 1명" 스펙-코드 불일치 (위 결정 7)
- 어드민 모듈과 동일하게 IP 기반 요청 제한(429)·refresh 토큰 로테이션 없음 — `admin-auth-module.md`에 이미 기록된 동일한 트레이드오프를 멤버 쪽도 그대로 상속
- `CommentController`의 `/admin/{commentId}/hide`는 여전히 `permitAll()`(인증 자체가 없음) — #117 이전부터 있던 별도 TODO, 이번엔 손대지 않음
