# 상태공간트리 QA — 멤버 인증(#117)

> 여러 "사용 상황의 설정"(누가·어떤 토큰으로·어떤 상태로·어디를 치는지)을 변수로 두고
> 상태공간트리를 구성 → 백트래킹(DFS)으로 잎(리프)까지 내려가며 테스트케이스를 뽑는
> 방식으로 커버리지를 점검한 기록. 코드가 바뀌면 이 문서의 트리·표부터 다시 맞는지
> 확인한다 — 트리는 "코드를 읽고 나온 명제"라 코드와 같이 낡는다.

## 왜 카티션 곱이 아니라 트리인가

변수를 그냥 다 곱하면(카티션 곱) 말이 안 되는 조합까지 기계적으로 생긴다 — 예를 들어
"익명 방문자인데 토큰이 유효함"이나 "SUPER_ADMIN인데 비밀번호 강제변경 대기중"은 세상에
존재할 수 없는 상태다(어드민 계정엔 `mustChangePassword` 개념 자체가 없다 — 어드민
로그인엔 항상 `false`가 박힌다, `JwtProvider.createAccessToken(Admin)`).

트리는 **부모가 정해지면 자식 질문 자체가 생기거나·안 생기거나·달라진다.** 이게 이
문서에서 쓰는 백트래킹의 핵심이다: DFS로 한 축의 값을 고르고, 그 선택에 맞는(더 좁은)
다음 축의 도메인으로 내려가고, 리프에서 테스트케이스 하나를 채집한 뒤, 형제 값으로
되돌아온다(backtrack). 무의미한 조합은애초에 안 만들어지므로 "가지치기"가 트리 구성
단계에서 이미 끝나 있다.

## 두 개의 트리로 나눈 이유 (설계 정정)

처음엔 `Actor`(익명/멤버/어드민/…) 밑에 `/api/member/auth/login`·`logout`·`refresh`·
`password`까지 전부 Endpoint 값으로 욱여넣었는데, 코드를 다시 보니 **로그인/로그아웃/
리프레시는 Actor(= access_token 상태)와 완전히 무관**했다 —
`MemberAuthController.refreshTokenOf()`는 `refresh_token` 쿠키만 읽지 SecurityContext는
아예 안 본다. Actor를 축으로 두고 그 밑에서 이 엔드포인트들을 반복 검증하는 건 서로
다른 자격증명(access_token vs refresh_token)을 같은 축으로 착각한, 트리 설계 자체의
결함이었다. 그래서 둘로 쪼갰다:

- **트리 A — 리소스 접근**: "누가(Actor·토큰상태·mustChangePassword) 어떤 리소스에
  접근할 수 있는가." `/api/member/auth/**`를 제외한 모든 엔드포인트.
- **트리 B — 인증 모듈 자기 자신**: `/api/member/auth/{login,logout,refresh,password}`
  각각이 **자기만의 자격증명**(로그인=요청 바디의 학번+비번, 로그아웃/리프레시=
  refresh_token 쿠키, 비밀번호변경=SecurityContext+currentPassword)으로 갈라지는
  하위 트리.

---

## 트리 A — 리소스 접근

### 축(레벨)

```
Lv1 Actor              anonymous / member / admin / super_admin
Lv2 TokenState          (anonymous면 이 레벨 자체가 없음 — 토큰이 없으니까)
                        valid / expired / tampered
                          └─ expired·tampered면 여기서 바로 리프(대표 1건, 아래 "동치류" 참고)
Lv3 MustChangePassword  (member ∧ TokenState=valid일 때만 존재. admin/super_admin은
                         이 레벨 자체가 없음 — 상수 false)
                        true / false
Lv4 Endpoint            public_posts / public_members / member_namespace_other(가상) /
                        admin_posts_get / admin_posts_patch / admin_members_create /
                        admin_members_password_reset
```

### 가지치기 근거 (동치류로 묶은 것들)

| 가지 | 왜 안 더 전개했나 |
|---|---|
| `TokenState=expired`/`tampered` | `JwtProvider.parseClaims()`가 `JwtException`(만료 포함)·`IllegalArgumentException`(서명불일치 등)을 구분 안 하고 둘 다 `Optional.empty()`로 접는다(72-75줄). `JwtAuthenticationFilter`는 그 결과 SecurityContext를 아예 안 채우고 통과시킨다 — 익명과 100% 동일 취급이라, 그 아래 `MustChangePassword × Endpoint`(최대 14개)를 또 전개하는 건 낭비. 대표 1건만 유지. |
| `hasAnyRole('ADMIN','SUPER_ADMIN')` 엔드포인트에서 ADMIN 또는 SUPER_ADMIN 중 하나만 테스트 | Spring Security의 `hasAnyRole`은 나열된 role 중 하나라도 맞으면 동일한 한 코드 경로로 통과시킨다 — 어느 쪽으로 테스트해도 같은 분기를 검증한다. `admin_posts_*`는 SUPER_ADMIN으로, `admin_members_password_reset`은 ADMIN으로 대표 검증(둘 다 있으면 중복). |

### 리프 → 테스트 대응표 (41개 리프, 발췌 — 전체 조합은 위 3개 레벨 곱으로 기계적으로 재현 가능)

| Actor | Token | MCP | Endpoint | 기대 | 테스트 |
|---|---|---|---|---|---|
| anonymous | – | – | public_posts / public_members | 200 | `MemberControllerTest.listMembers_Public_Returns200`, `PostControllerTest.listPosts_ReturnsOnlyPublished` |
| anonymous | – | – | admin_posts_get | 401 | `AdminAuthControllerTest.adminFeedRoute_NoCookie_NowReturns401` |
| anonymous | – | – | admin_posts_patch | 401 | `PostControllerTest.updateStatus_NoCookie_Returns401` |
| anonymous | – | – | admin_members_create / password_reset | 4xx | `MemberControllerTest.createMember_Unauthenticated_Returns4xx` / `resetPassword_Unauthenticated_Returns4xx` |
| member | valid | true | public_* | 200 | `MemberAuthControllerTest.mustChangePassword_BlocksMemberNamespaceButAllowsPublicApiAndPasswordChange` |
| member | valid | true | member_namespace_other(가상) | 403 MUST_CHANGE_PASSWORD | 〃 |
| member | valid | true/false | admin_posts_get/patch | 403 FORBIDDEN(mcp 무관) | `PostControllerTest.adminList_Member_Returns403`, `adminList_MemberMustChangePassword_Returns403ForbiddenNotGuard`, `updateStatus_Member_Returns403`, `updateStatus_MemberMustChangePassword_Returns403ForbiddenNotGuard` |
| member | valid | false | member_namespace_other(가상) | 404(가드 통과 후 실존 안 함) | `mustChangePassword_...` 테스트 후반부 |
| admin/super_admin | valid | (없음) | admin_posts_get/patch | 200 | `PostControllerTest.adminList_SuperAdmin_Returns200`, `updateStatus_DraftToPublished_Returns200` |
| admin | valid | (없음) | admin_members_create | 403(SUPER_ADMIN 전용) | `MemberControllerTest.createMember_NotSuperAdmin_Returns403` |
| admin | valid | (없음) | admin_members_password_reset | 200 | `MemberControllerTest.resetPassword_ByRegularAdmin_Returns200` |
| super_admin | valid | (없음) | admin_members_create | 201 | `MemberControllerTest.createMember_SuperAdmin_Returns201` |
| member/admin/super_admin | expired/tampered | – | (대표) | 401 (익명과 동치) | 별도 테스트 없음 — `JwtAuthenticationFilter`가 익명과 동일 코드 경로를 타므로 anonymous 케이스가 사실상 이 경로도 검증한다 |

---

## 트리 B — 인증 모듈 자기 자신

### `/api/member/auth/login` — Lock × Credential

| Lock | Credential | 기대 | 테스트 |
|---|---|---|---|
| locked | correct | 423 (자격증명 정오 무관) | `login_FifthFailedAttempt_LocksAccount` 후반부 |
| locked | wrong | 423 | `login_FifthFailedAttempt_LocksAccount` |
| unlocked | correct | 200 + 토큰쌍 | `login_ValidCredentials_SetsCookiesAndReturnsAccountWithMustChangePasswordTrue` |
| unlocked | wrong | 401 (5번째면 423로 전이) | `login_WrongPassword_Returns401` |
| (특수) 유효한 mustChangePassword=true access_token 쿠키를 들고 로그인 시도 | 여전히 200 — 로그인은 Actor와 무관 | `login_WithStaleMustChangePasswordAccessTokenCookie_StillSucceeds` |

### `/api/member/auth/logout` — RefreshTokenCookieState

| 상태 | 기대 | 테스트 |
|---|---|---|
| 쿠키 없음 | 200 (no-op) | `logout_NoCookie_StillReturns200` |
| 깨진/의미없는 문자열 | 200 (no-op, DB에서 못 찾아도 `.ifPresent`만 스킵) | `logout_GarbageCookie_StillReturns200` |
| 유효한 토큰 | 200 + 해당 토큰 revoke | `logout_RevokesRefreshTokenSoSubsequentRefreshFails` |

### `/api/member/auth/refresh` — RefreshTokenCookieState

| 상태 | 기대 | 테스트 |
|---|---|---|
| 쿠키 없음 | 401 | `refresh_NoRefreshCookie_Returns401` |
| 유효한 토큰 | 200 + 새 access 토큰 | `refresh_ValidRefreshCookie_IssuesNewAccessTokenCookie` |
| DB에서 revoked=true (로그아웃됨) | 401 | `logout_RevokesRefreshTokenSoSubsequentRefreshFails` 후반부 |
| DB의 `expires_at`이 과거(저장 행 자체 만료) | 401 | `refresh_ExpiredStoredToken_Returns401` |
| access 토큰을 refresh 자리에 보냄(typ 클레임 불일치) | 401 | `refresh_AccessTokenUsedAsRefreshToken_Returns401` |
| 서명검증 실패(깨진 문자열) | 401 | `refresh_GarbageCookie_Returns401` |

### `/api/member/auth/password` — 역할게이트 × CurrentPassword × NewPasswordPolicy

먼저 역할 게이트(hasRole('MEMBER')), 그다음 currentPassword, 그다음 newPassword 정책
순서로 검사한다(코드 순서 그대로) — 그래서 currentPassword가 틀리면 newPassword가
약해도 항상 401이 먼저 난다(동치류로 묶어 별도 리프 안 둠).

| 상태 | 기대 | 테스트 |
|---|---|---|
| 쿠키 없음(미인증) | 401 UNAUTHENTICATED | `changePassword_NoCookie_Returns401` |
| 인증은 됐지만 MEMBER 아님(예: ADMIN) | 403 FORBIDDEN | `changePassword_AdminRole_Returns403` |
| MEMBER, currentPassword 틀림 | 401 INVALID_CREDENTIALS, 비번 안 바뀜 | `changePassword_WrongCurrentPassword_Returns401AndDoesNotChangeIt` |
| MEMBER, currentPassword 맞음, newPassword 정책 미달 | 400 WEAK_PASSWORD | `changePassword_WeakNewPassword_Returns400` |
| MEMBER, currentPassword 맞음, newPassword 정책 통과 | 200, mustChangePassword=false, 새 토큰쌍 | `mustChangePassword_BlocksMemberNamespaceButAllowsPublicApiAndPasswordChange` |

---

## 이 문서를 다시 쓸 일이 생기면

- 코드가 바뀌어서 어떤 리프의 "기대"가 달라지면, 표부터 고치고 → 해당 테스트를 고친다
  (표 → 코드가 아니라 코드가 정답이다. 표가 코드와 다르면 표를 믿지 말고 실제 테스트를
  돌려서 확인한다).
- 새 축이 필요해지면(예: 멤버 전용 실제 API가 생겨서 `member_namespace_other`가 더 이상
  가상 경로가 아니게 되면) 그 축의 도메인과, 그게 어떤 부모 조건에서만 존재하는지부터
  정의하고 표를 늘린다.
- "동치류로 묶었다"는 판단이 더 이상 성립하지 않으면(예: `expired`와 `tampered`를
  나중에 다르게 처리하도록 코드가 바뀌면) 그 가지치기부터 원복해서 다시 전개한다.
