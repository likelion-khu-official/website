# #145 부원 계정 관리 — 블랙박스 E2E QA

> `pm/missions/117-account-auth-member-tier/qa-blackbox-e2e.md`·`119-project-showcase-be/qa-blackbox-e2e.md`와 같은 방법론(완료기준 기반 시나리오 설계 → 실제 요청으로 관찰)을 적용하되, 실행 방식은 다르다: #117·#119는 별도 프로세스로 서버를 띄워 소켓 HTTP로 찔렀고, 이 기능은 외부 시스템 경계(메일 발송 등)가 없어 그 방식의 이점이 크지 않다. 대신 `admin.seed.super-admins`가 초대 메일 발송에 의존해 소켓 기동엔 Mailpit 같은 메일 서버가 필요한데, 그 인프라를 새로 갖추는 비용이 검증 신뢰도 증가분보다 커서 — **MockMvc 기반 실행**(DispatcherServlet·SecurityFilterChain·실제 SQLite까지 그대로 통과, 소켓 레이어만 생략)으로 대체했다. `MemberControllerTest`·`MemberAuthControllerTest`·`MemberAuthServiceTest`(신규)의 이번 실행 결과를 근거로 삼는다.

## 이번 QA의 계기

코드 리뷰 중 위키 [정보구조와 권한](https://github.com/likelion-khu-official/website/wiki/정보구조와-권한)과 대조해보니, 멤버 등록·수정이 실제로는 **SUPER_ADMIN 전용**으로 구현돼 있었다. 위키는 "관리자(ADMIN) — 멤버 등록·정보 수정·비밀번호 초기화·오프보딩, 최고관리자 전용은 관리자 임명·회수·승계뿐"이라고 명시한다. `MemberController.create/update`의 `@PreAuthorize`를 `hasRole('SUPER_ADMIN')` → `hasAnyRole('ADMIN','SUPER_ADMIN')`로 고치고, 이 QA로 권한 경계를 다시 확인했다.

## 결과 요약 — proposal.md 완료기준 대조

| proposal.md의 완료기준 | 결과 |
|---|---|
| 등록 시 아이디=학번, 초기 비번=전화번호, 이모지 서버 자동배정 | ✅ |
| 목록 조회 + 이름·역할 등 정보 수정 | ✅ |
| 비번 초기화 버튼 한 번 → 전화번호로 복귀 | ✅ |
| 오프보딩하면 로그인만 막히고 글·기록은 남음 | ✅ |
| 관리자(ADMIN·SUPER_ADMIN) 아니면 화면·동작 접근 불가 | ✅ — 단, 등록·수정의 하한선이 이번 QA로 SUPER_ADMIN→ADMIN으로 정정됨(위키 기준) |
| 프론트팀(박일하·김현정) 리뷰 승인 | ⏳ 미완료 — PR #155 아직 승인 대기 |

## 실행한 시나리오

| ID | 시나리오 | 기대 | 결과 |
|---|---|---|---|
| T1 | ADMIN이 `POST /api/admin/members` 등록 | 201 (수정 전엔 403이었음) | ✅ |
| T2 | ADMIN이 `PATCH /api/admin/members/{id}` 수정 | 200 (수정 전엔 403이었음) | ✅ |
| T3 | SUPER_ADMIN이 등록·수정 | 201/200 (기존 동작 유지 확인 — 회귀 없음) | ✅ |
| T4 | MEMBER 역할로 등록·수정 시도 | 403 | ✅ |
| T5 | 비로그인으로 등록·수정 시도 | 401 | ✅ |
| T6 | 학번 중복 등록 | 409 | ✅ |
| T7 | 필수값(이름/역할/기수/학번) 누락 등록 | 400 | ✅ |
| T8 | ADMIN이 `GET /api/admin/members` 조회 | 200, studentId·offboarded 포함 | ✅ |
| T9 | ADMIN이 비밀번호 초기화 | 200 | ✅ |
| T10 | ADMIN이 오프보딩 실행 | 200, 목록에서 `offboarded:true` | ✅ |
| T11 | 오프보딩된 학번+원래 비번(전화번호)으로 로그인 시도 | 401 `INVALID_CREDENTIALS`(계정 존재 여부 비노출, 오답과 동일 메시지) | ✅ |
| T12 | (신규 단위) 오프보딩 처리 시 비밀번호 비교 전에 이미 차단되는지 | `passwordEncoder` 호출 자체가 안 일어남 | ✅ — `MemberAuthServiceTest.login_OffboardedMember_ThrowsBeforeCheckingPassword` |
| T13 | (신규 단위) 잠긴 계정은 올바른 비번으로도 여전히 잠김 | `AccountLockedException`, 비번 비교 안 함 | ✅ |
| T14 | (신규 단위) 오프보딩 시 그 멤버의 활성 refresh 토큰 전부 폐기 | 토큰 `isValid()==false` | ✅ — 초기 구현에 `member.getId()`가 테스트 stub id와 어긋나 토큰이 안 지워지는 상태로도 테스트가 통과할 뻔한 버그를 잡아서 고침(엔티티 id를 테스트에서 직접 세팅하지 않으면 `revokeAllTokensFor(null)`이 호출돼 조용히 아무 것도 안 지워짐) |
| T15 | MEMBER 역할로 오프보딩·비번초기화·관리자목록 접근 | 403 | ✅ |
| T16 | 존재하지 않는 id로 수정/비번초기화/오프보딩 | 404 | ✅ |

## 결론

**권한 갭 1건 발견 → 이번 QA에서 직접 고침.** 멤버 등록·수정이 위키 스펙(ADMIN 이상)보다 좁게(SUPER_ADMIN 전용) 구현돼 있던 걸 찾아 `MemberController`를 수정하고, 회귀 테스트(T1~T5)로 SUPER_ADMIN 동작은 그대로인지·MEMBER/비로그인은 여전히 막히는지 다시 확인했다. 프론트(`MemberManagement.tsx`)의 등록·수정 버튼도 SUPER_ADMIN 전용 노출 조건을 제거했다 — 이 화면 자체가 이미 ADMIN 이상만 진입 가능해서 화면 안에서 추가로 역할을 나눌 이유가 없어졌기 때문이다.

**테스트 빈틈 1건 발견 → 단위 테스트 추가로 메움.** `MemberAuthService`(오프보딩·로그인차단·비번초기화)에 DB 없이 도는 순수 단위 테스트가 하나도 없었다. 추가하는 과정에서 `Member.create()`가 id를 채우지 않는다는 점을 놓쳐 토큰 폐기가 실제로는 검증되지 않는 상태로 테스트가 "통과"할 뻔한 걸 잡았다(T14) — 이 자체가 단위 테스트 계층이 없었을 때의 리스크를 보여준다.

<sub>실행 2026-07-23 · 방법 MockMvc 기반 블랙박스(소켓 HTTP 아님, 사유는 상단 방법론 참고) + 신규 Mockito 단위 테스트 · 브랜치 feat/145-admin-member-manage(PR #155)</sub>

## 후속(2026-07-26) — 학번 unique 재설계 + 실제 마이그레이션 검증

위 QA엔 없던 시나리오가 PR #155 리뷰에서 나왔다: "14기 오프보딩 후 15기로 재입부하면 어떻게 되나?" 확인해보니 학번에 전역 unique가 걸려 있어 오프보딩된 학번이 **영구 재사용 불가**였다(오프보딩은 로그인만 막는 소프트 딜리트라 row가 DB에 남는데, 그 학번으로 다시는 등록을 못 함). 위 표의 T6(학번 중복 등록 409)는 여전히 맞는 동작이지만, "오프보딩된 뒤에도" 그런지는 안 다뤘던 갭.

**고친 것**: 학번 unique를 `(학번, 기수)` 복합키로 바꿨다. "동시에 두 기수로 활동 중일 순 없다"는 불변식은 별도로(활동 중=오프보딩 안 된 레코드 존재 여부) 체크한다.

**애플리케이션 코드만 고치면 안 됐던 이유**: 이 레포는 Flyway(#133)로 스키마를 관리해서, 엔티티 애노테이션만 고치면 실제 stage/prod DB엔 전혀 반영이 안 된다 — 실제 파일 SQLite로 재현해서 원본 `SQLITE_CONSTRAINT_UNIQUE` 예외까지 확인했다. 그래서 `V2__member_offboarding_and_cohort_unique.sql`(테이블 재생성 패턴 — SQLite는 기존 컬럼의 unique 제약을 ALTER로 못 바꿈)을 추가하고, "이미 앞 버전까지 적용된 실데이터 DB에 새 마이그레이션이 얹히는" 실제 배포 경로까지 재현하는 재사용 테스트 도구(`MigrationUpgradeHarness`)로 검증했다.

**연관 리스크도 같이 잡음**: 학번 하나가 이제 여러 row(재입부 이력)를 가질 수 있는데, 기존 `MemberRepository.findByStudentId`가 `Optional<Member>`(단일 결과 기대)였다 — 재입부가 실제로 일어난 학번을 조회하면 `IncorrectResultSizeDataAccessException`으로 터질 뻔한 지뢰였다. `findAllByStudentId`(List 반환)로 바꾸고 호출부(테스트)도 다 맞춰 고쳤다. 로그인 조회(`findByStudentIdAndOffboardedAtIsNull`)는 원래도 활동 중인 것 하나로 좁혀서 조회해 이 문제가 없었다.

| ID | 시나리오 | 기대 | 결과 |
|---|---|---|---|
| T17 | 활동 중인 학번을 다른 기수로 중복 등록 시도 | 409 | ✅ |
| T18 | 14기 오프보딩 후 15기로 같은 학번 재등록 | 201 | ✅ |
| T19 | 재입부 후 — 새 계정(새 기수)으로는 로그인, 옛 계정 비번으로는 여전히 차단 | 새 계정 200 / 옛 계정 401 | ✅ |
| T20 | (마이그레이션) V1만 적용된 실데이터 DB에 V2를 얹었을 때 기존 행 보존 + 재입부 성공 | 데이터 보존, 재입부 성공 | ✅ — `MemberUniqueConstraintUpgradeTest`(실제 Flyway 경로) |
| T21 | 재입부로 학번 하나가 row 2개가 된 상태에서 `findAllByStudentId` 조회 | 예외 없이 2건 리턴 | ✅ |

실제 GitHub Actions CI(backend unit/integration·frontend·gitleaks)까지 그린 확인.

<sub>실행 2026-07-26 · 방법 로컬 MockMvc + Mockito 단위 테스트 + 실제 파일 SQLite(Flyway) 재현 + GitHub Actions CI · 브랜치 feat/145-admin-member-manage(PR #155)</sub>
