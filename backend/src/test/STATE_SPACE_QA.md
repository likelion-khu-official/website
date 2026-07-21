# 상태공간트리 QA — 멤버 인증(#117) · 프로젝트 쇼케이스(#119)

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
Lv4 Endpoint            public_posts(GET) / public_members(GET) / member_namespace_other(가상,PATCH) /
                        admin_posts_get(GET) / admin_posts_patch(PATCH) / admin_members_create(POST) /
                        admin_members_password_reset(POST)
```

> **주의(재설계 반영)**: `MemberPasswordGuardFilter`가 "경로가 `/api/member/`인가"에서
> "**쓰기 메서드(POST/PUT/PATCH/DELETE)인가**"로 바뀌면서, mcp=true일 때 Endpoint의
> HTTP 메서드가 GET이냐 쓰기 메서드냐에 따라 **같은 role-403이라도 이유(code)가 갈린다.**
> GET 계열(`admin_posts_get`)은 가드가 아예 안 보므로 role 체크(`FORBIDDEN`)로 막히고,
> 쓰기 계열(`admin_posts_patch`·`admin_members_create`·`admin_members_password_reset`)은
> role 체크에 닿기도 전에 가드(`MUST_CHANGE_PASSWORD`)가 먼저 막는다. 아래 표의
> `admin_posts_patch` 행을 GET 행과 분리한 이유.

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
| member | valid | true/false | admin_posts_get(GET) | 403 FORBIDDEN(mcp 무관 — 가드는 GET을 안 봄) | `PostControllerTest.adminList_Member_Returns403`, `adminList_MemberMustChangePassword_Returns403ForbiddenNotGuard` |
| member | valid | false | admin_posts_patch(PATCH) | 403 FORBIDDEN(role 체크) | `PostControllerTest.updateStatus_Member_Returns403` |
| member | valid | true | admin_posts_patch(PATCH) | 403 **MUST_CHANGE_PASSWORD**(가드가 role보다 먼저) | `PostControllerTest.updateStatus_MemberMustChangePassword_Returns403ViaGuardBeforeRoleCheck` |
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

---

## 트리 C — 프로젝트 쇼케이스(#119)

`/api/projects`(멤버 전용 쓰기)가 `/api/member/` 밖에 있다는 사실 자체가 #117의
`MemberPasswordGuardFilter` 설계(트리 A 참고)를 재검토하게 만든 계기였다 — 그 결과가
"쓰기 메서드 기반"으로의 일반화(위 설계 결정 11)다. 이 트리는 그 일반화가 실제로
`/api/projects`를 커버하는지 검증한다.

### 축(레벨)

```
Lv1 Endpoint            list(GET) / detail(GET) / create(POST) / update(PATCH) /
                        delete(DELETE) / hidden(PATCH, /api/admin/projects/{id}/hidden)
Lv2 Actor               (list/detail은 이 레벨 없음 — 완전 공개)
                        anonymous / member(mcp=false) / member(mcp=true) / admin·super_admin
Lv3 OwnershipRelation    (update/delete만, member(mcp=false)일 때만 의미 있음)
                        sole(단독 소유 — 참여자 1명, 나뿐) /
                        shared(공동 소유 — 참여자 여럿, 나도 그중 하나) /
                        none(비소유 — 참여자 아님)
Lv4 세부 검증축          (create/update만) 대표이미지 개수(0/1/2+) · 참여자 자기포함 여부 ·
                        참여자 중복(같은 memberId 2번) · 존재하지 않는 참여자 memberId ·
                        존재하지 않는 project id
```

> **왜 "Creator"가 아니라 "OwnershipRelation"인가**: 처음엔 "만든 사람 vs 나중에 추가된
> 참여자"로 잡을 뻔했는데, 코드(`requireParticipant()` = `existsByProjectIdAndMemberId`)엔
> "만든 사람"이라는 개념 자체가 없다(`Project` 엔티티에 creator 필드가 없다 — 참여자 집합만
> 있다). 유저 신원별로 트리를 쪼개는 건 비효율적이고, 코드가 실제로 보는 건 "요청자가
> 참여자 집합의 원소인가"뿐이다. 다만 `sole`과 `shared`를 굳이 나누는 이유는: 집합
> 멤버십 체크를 실수로 "첫 참여자(=원래 유일했던 사람)인가"로 잘못 짰다면 `sole`에서는
> 우연히 똑같이 통과해 버그가 안 드러나고 `shared`에서만 드러나기 때문이다.

### 가지치기 근거

| 가지 | 왜 안 더 전개했나 |
|---|---|
| `member(mcp=true)`에서 OwnershipRelation 축 | 가드가 role 체크·소유권 체크보다 먼저 막아서(403 MUST_CHANGE_PASSWORD), 참여 관계가 뭐든 결과에 영향이 없다 — 더 안 나눈다. |
| `list`/`detail`에서 Actor 축 | 두 엔드포인트 다 `permitAll()`이고 코드가 인증 여부를 아예 안 본다(hidden 여부만 봄) — anonymous 대표 1건으로 충분(트리 B의 로그아웃/리프레시와 같은 근거). |
| `hidden`에서 `member(mcp=true)` | `hasAnyRole('ADMIN','SUPER_ADMIN')`이 먼저 걸려 MEMBER는 mcp 값과 무관하게 애초에 진입 불가 — admin 계정은 mcp 개념 자체가 없어(트리 A와 동일 이유) 이 축이 성립하지 않는다. |
| 모든 Endpoint에서 "리소스가 여럿 존재하는가" 축 | 이건 "요청자가 누구고 뭘 요청하는가"라는 이 트리의 분류 기준과 성격이 다른, 데이터 격리 불변식 질문이라 트리에 안 넣고 별도 테스트로 뺐다(아래 "이 트리가 실제로 잡아낸 버그" 4번 참고). |

### 리프 → 테스트 대응표

| Endpoint | 상태 | 기대 | 테스트 |
|---|---|---|---|
| list/detail | hidden 프로젝트 | 목록 제외 / 상세 404 | `list_Public_ExcludesHiddenProjects`, `get_HiddenProject_Returns404` |
| list/detail | 정상 | 200, 대표이미지·이미지전부·참여자 포함 | `list_Public_ReturnsRepresentativeImageUrl`, `get_Public_ReturnsImagesAndParticipants` |
| detail | 존재하지 않는 id | 404 | `get_NonExistentId_Returns404` |
| create | anonymous | 401 | `create_Unauthenticated_Returns401` |
| create | admin/super_admin(MEMBER 아님) | 403 | `create_NotMemberRole_Returns403` |
| create | member(mcp=true) | 403 MUST_CHANGE_PASSWORD | `create_MustChangePasswordMember_Returns403` |
| create | member(mcp=false), 본인 미포함 | 400 | `create_WithoutSelfInParticipants_Returns400` |
| create | member(mcp=false), 대표이미지 0장/2장+ | 400 | `create_NoRepresentativeImage_Returns400`, `create_TwoRepresentativeImages_Returns400` |
| create | member(mcp=false), 존재하지 않는 참여자 memberId | 404 | `create_NonExistentParticipantMemberId_Returns404` |
| create | member(mcp=false), 참여자 중복(같은 memberId 2번) | 400 | `create_DuplicateParticipant_Returns400` |
| create | member(mcp=false), 정상 | 201 | `create_AsParticipant_Returns201` |
| update | anonymous | 401 | `update_Unauthenticated_Returns401` |
| update | member(mcp=true) | 403 MUST_CHANGE_PASSWORD | `update_MustChangePasswordMember_Returns403` |
| update | member(mcp=false), none(비참여자) | 403 | `update_ByNonParticipant_Returns403` |
| update | member(mcp=false), sole, 존재하지 않는 id | 404 | `update_NonExistentId_Returns404` |
| update | member(mcp=false), sole, 참여자목록 빈값 | 400 | `update_EmptyParticipants_Returns400` |
| update | member(mcp=false), sole, 참여자목록에서 본인 제외 | 400 | `update_RemovesSelfFromParticipants_Returns400` |
| update | member(mcp=false), sole, 참여자 중복 | 400 | `update_DuplicateParticipant_Returns400` |
| update | member(mcp=false), sole, 대표이미지 0장 | 400 | `update_NoRepresentativeImage_Returns400` |
| update | member(mcp=false), sole, 정상 | 200 | `update_ByParticipant_Returns200` |
| update | member(mcp=false), **shared**(공동소유, 본인은 나중 참여자), 정상 | 200 | `update_ByCoParticipantWhoIsNotCreator_Returns200` |
| delete | anonymous | 401 | `delete_Unauthenticated_Returns401` |
| delete | member(mcp=true) | 403 MUST_CHANGE_PASSWORD | `delete_MustChangePasswordMember_Returns403` |
| delete | member(mcp=false), none(비참여자) | 403 | `delete_ByNonParticipant_Returns403` |
| delete | member(mcp=false), sole, 존재하지 않는 id | 404 | `delete_NonExistentId_Returns404` |
| delete | member(mcp=false), sole, 정상 | 200 + 이후 조회 404 | `delete_ByParticipant_Returns200` |
| delete | member(mcp=false), **shared**(공동소유, 본인은 나중 참여자), 정상 | 200 | `delete_ByCoParticipantWhoIsNotCreator_Returns200` |
| hidden | anonymous | 401 | `hidden_Unauthenticated_Returns401` |
| hidden | member(mcp 무관) | 403 | `hidden_ByMember_Returns403` |
| hidden | admin/super_admin, 존재하지 않는 id | 404 | `hidden_NonExistentId_Returns404` |
| hidden | admin/super_admin, 정상 | 200, 공개목록·상세에서 제외되지만 데이터는 보존 | `hidden_ByAdmin_HidesFromPublicButKeptInStorage` |

### 이 트리가 실제로 잡아낸 버그 4건 (리뷰 당시 코드엔 테스트가 아예 없었음)

1. **`member(mcp=true)`가 세 쓰기 엔드포인트(create/update/delete)를 전부 통과할 수 있었다** — `MemberPasswordGuardFilter`가 `/api/member/` 네임스페이스만 보던 구버전이 원인. `ProjectControllerTest`의 인증 헬퍼(`memberAuthentication`)가 `mustChangePassword`를 항상 `false`로 하드코딩해뒀던 것도 이 조합이 테스트에 존재조차 안 했다는 증거였다. → 가드를 쓰기 메서드 기반으로 일반화(설계 결정 11)해서 해결.
2. **`update()`가 참여자 목록에서 요청자 본인을 빼도 막지 않았다** — `create()`의 `requireSelfAmongParticipants` 검증이 `update()`엔 없었다. → `update()`에도 같은 검증을 추가.
3. **(발견 자체가 아니라 커버리지 편향) `shared`(공동 소유) 상태가 테스트에 한 번도 없었다** — 모든 픽스처가 참여자 1명(만든 사람 본인)짜리 프로젝트만 만들어서, "참여자 집합에 있는가" 체크가 실은 "유일한/첫 참여자인가"로 잘못 짜여 있어도 안 드러나는 상태였다. 실제로 버그는 없었지만(코드는 `existsByProjectIdAndMemberId`로 정확했다), 이 축이 트리에 없었다는 것 자체가 지적 대상 — `update_ByCoParticipantWhoIsNotCreator_Returns200`/`delete_...`로 메꿨다.
4. **참여자 목록에 같은 memberId를 두 번 넣어도 막는 게 없었다** — `ProjectParticipant`에 유니크 제약이 없어 중복 행이 그대로 저장됐다. → `requireNoDuplicateParticipants()` 추가.

### 트리엔 없지만 확인한 것 — 데이터 격리 불변식

"리소스가 여럿 있을 때 서로 안 섞이는가"는 요청자·엔드포인트 조합이 아니라 별개의
질문이라 트리 밖에 뒀다. 두 프로젝트를 만들고 하나만 삭제/수정해서 다른 하나의
이미지·참여자가 그대로인지만 확인한다: `delete_DoesNotAffectOtherProjectsImagesOrParticipants`,
`update_ImagesAndParticipantReplace_DoesNotAffectOtherProjects`.

## 이 문서를 다시 쓸 일이 생기면

- 코드가 바뀌어서 어떤 리프의 "기대"가 달라지면, 표부터 고치고 → 해당 테스트를 고친다
  (표 → 코드가 아니라 코드가 정답이다. 표가 코드와 다르면 표를 믿지 말고 실제 테스트를
  돌려서 확인한다).
- 새 축이 필요해지면(예: 멤버 전용 실제 API가 생겨서 `member_namespace_other`가 더 이상
  가상 경로가 아니게 되면) 그 축의 도메인과, 그게 어떤 부모 조건에서만 존재하는지부터
  정의하고 표를 늘린다.
- "동치류로 묶었다"는 판단이 더 이상 성립하지 않으면(예: `expired`와 `tampered`를
  나중에 다르게 처리하도록 코드가 바뀌면) 그 가지치기부터 원복해서 다시 전개한다.
- **새 멤버 전용 API가 생기면(글쓰기·내프로필편집 등, 루트 `README.md`의 "멤버 영역"
  참고) 트리 C처럼 "member(mcp=true) → 403 MUST_CHANGE_PASSWORD"부터 확인한다.**
  `MemberPasswordGuardFilter`가 쓰기 메서드 기반으로 일반화돼 있어서 대부분 자동으로
  커버되지만, 그 API가 GET인데도 예외적으로 상태 변경을 한다거나 하는 특이 케이스는
  가정하지 말고 직접 찔러본다 — 트리 A→B→C가 전부 "한 기능만 보고 설계한 규칙이
  다음 기능에서 뚫렸다"는 패턴을 반복했다는 걸 잊지 않는다.
