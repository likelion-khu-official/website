# 프로젝트 쇼케이스 모듈 (`likelion.khu.website.project`) — #119

부원이 참여한 프로젝트를 소개하는 목록·상세 API. **`feat/117-member-auth` 브랜치 위에서 작업했다** — 생성·수정·삭제가 "로그인한 멤버"를 전제로 하는데, #117(멤버 학번 로그인) 이전엔 멤버가 로그인할 방법 자체가 없었기 때문이다. 그래서 이 PR은 #117이 먼저 머지된 뒤에 dev를 대상으로 다시 열거나, #117 위에 스택된 PR로 올라간다.

## Target / 정본 스펙

- 기능 트리: [`프로젝트 쇼케이스`](../../pm/features/프로젝트-쇼케이스.md) 및 하위 [목록](../../pm/features/프로젝트-목록.md)·[상세](../../pm/features/프로젝트-상세.md), 멤버 영역의 [내 프로젝트](../../pm/features/내프로젝트.md)
- 정식 스펙: [서비스 위키 — 기능 명세](https://github.com/likelion-khu-official/website/wiki/기능-명세)
- 미션 발주 원문: [이슈 #119](https://github.com/likelion-khu-official/website/issues/119)

## 구성 요소

| 파일 | 역할 |
|---|---|
| `Project.java` | 제목·한줄소개·기수(불변)·기술스택(태그)·GitHub링크·개발기간(`startDate`/`endDate`, 종료일 없으면 진행중)·`hidden`. 상세 설명·발표자료는 스펙상 "처음엔 생략 가능"이라 필드 자체를 안 만들었다 |
| `ProjectImage.java` | `@ManyToOne` 자식 엔티티(`Comment`와 같은 FK 패턴). `url`은 새로 업로드 코드를 만들지 않고 **기존 `/api/feed/images`(OCI, #75)로 먼저 올려 받은 URL을 그대로 저장**한다 — `Post.thumbnailUrl`·`Member.photoUrl`과 동일한 재사용 방식. `representative`(대표 이미지)는 정확히 1장이어야 한다 |
| `ProjectParticipant.java` | `@ManyToOne` 자식 엔티티, `Member` FK + `part`(`MemberRole` 재사용 — PM/FE/BE/DESIGN/INFRA). `Member.roles`(조직 전체 역할)와는 별개로, "이 프로젝트에서 맡은 역할"을 담는다 |
| `ProjectRepository`/`ProjectImageRepository`/`ProjectParticipantRepository` | 목록·상세 조회, 참여 여부 확인(`existsByProjectIdAndMemberId`) |
| `dto/ProjectSummaryResponse`·`ProjectDetailResponse`(+ `ProjectImageResponse`·`ProjectParticipantResponse`) | `Post`의 목록/상세 이원 DTO 패턴을 그대로 따랐다. `representativeImageUrl`은 자식 테이블에서 오는 값이라 서비스가 조립해 넘긴다 |
| `dto/ProjectCreateRequest`·`ProjectUpdateRequest`(+ `ProjectImageRequest`·`ProjectParticipantRequest`) | 생성은 전체 필드, 수정은 `Member`/`Post`와 같은 부분 수정 관례(null=안 바뀜). `cohort`는 `Member.cohort`처럼 불변이라 수정 DTO에 없음 |
| `dto/ProjectHiddenUpdateRequest`·`ProjectSuccessResponse` | 숨김 토글 요청, delete/hidden 공통 `{success:true}` 응답(`AdminSuccessResponse`/`MemberSuccessResponse`와 같은 모듈별 경량 duplicate 관례) |
| `ProjectService` | 공개 목록(`hidden=false`)·상세, 생성(본인 참여 검증)·수정·삭제(참여자 권한 검증), 관리자 숨김 토글 |
| `ProjectController` | `GET /api/projects`·`GET /api/projects/{id}`(공개) · `POST`/`PATCH`/`DELETE /api/projects{,/{id}}`(`hasRole('MEMBER')`) · `PATCH /api/admin/projects/{id}/hidden`(`hasAnyRole('ADMIN','SUPER_ADMIN')`) |
| `config/SecurityConfig` | `GET /api/projects`·`/api/projects/*`만 `permitAll()` 추가. 나머지는 기본 `authenticated()` + 컨트롤러의 `@PreAuthorize`로 충분(기존 `/api/admin/members` 패턴과 동일) |

## 설계 결정과 이유

**1. 엔드포인트 경로 — `/projects`가 아니라 `/api/projects`**
이슈 본문의 "`/projects`"는 프론트 화면 URL 설명이다(실제로 `pm/features/프로젝트-목록.md`도 "`/projects` 목록 **화면**"이라고 씀). 기존 API는 전부 `/api/` 접두사(`/api/posts`, `/api/members`)라 그 컨벤션을 따랐다. 경로 결정은 이슈 Notes에서 명시적으로 제 재량.

**2. 목록에 페이지네이션을 안 쓴 이유**
`Post`(블로그 글, 계속 쌓임)는 `Page<PostSummaryResponse>`를 쓰지만, 프로젝트는 동아리 규모상 `Member`처럼 소규모 컬렉션이라 `GET /api/members`와 같은 단순 `List` 응답을 택했다. 나중에 프로젝트 수가 실제로 많아지면 그때 페이지네이션을 얹으면 된다(YAGNI).

**3. 숨김을 상태전이 대신 단순 불리언으로 만든 이유**
`Post`는 DRAFT→PUBLISHED→HIDDEN 전이가 있는데, 이건 "초안 작성 중" 상태가 실제로 필요해서다. 프로젝트는 등록하면 바로 공개고 초안 개념이 스펙에 없어, `Comment.hidden`과 같은 단순 불리언 + `setHidden(boolean)`으로 충분하다고 판단했다. `PATCH .../hidden`을 hide 전용이 아니라 `{hidden: boolean}`으로 만들어 숨김 해제(복원)도 같은 엔드포인트로 가능하게 했다 — Done엔 "숨길 수 있다"만 있지만, 관리자가 실수로 숨긴 걸 되돌릴 방법이 아예 없으면 오히려 위험하다고 판단해 자연스러운 역방향까지 포함했다(별도 기능 추가라기보다 같은 능력의 대칭).

**4. "참여 멤버 본인"을 검증하는 방식 — 요청 본문의 참여자 목록에 본인이 포함돼야 생성 가능**
생성 시 로그인한 멤버의 id가 `participants` 목록에 없으면 400으로 막는다(`ProjectService.requireSelfAmongParticipants`). 수정·삭제는 이미 저장된 `ProjectParticipant`에 해당 멤버가 있는지(`existsByProjectIdAndMemberId`)로 검증한다 — Done의 "참여하지 않은 프로젝트는 못 건드린다"를 그대로 구현한 것.

**5. 이미지·참여자 수정은 부분 수정이 아니라 "넘기면 전체 교체"**
`Member.roles`가 이미 이 관례다(넘긴 Set으로 전체 교체). 이미지·참여자처럼 컬렉션인 필드를 항목 단위로 추가/삭제하는 API를 따로 만들면 표면적이 커져서, 프론트가 전체 목록을 다시 보내는 방식(넘기면 교체, `null`이면 안 건드림)을 택했다. 단, 참여자를 빈 배열로 보내는 건 막았다(`update_EmptyParticipants_Returns400`) — 참여자가 0명이 되면 그 프로젝트를 아무도 못 건드리게 되는 막다른 상태라서.

**6. delete/hidden 응답을 204가 아니라 `{success:true}`로 바꾼 이유(구현 중 발견)**
처음엔 REST 관례대로 `204 No Content`로 짰는데, 코드베이스를 다시 보니 기존 delete류 엔드포인트(`AdminManagementController.remove`, `AdminInvitationController.cancel`)가 전부 `{success:true}` 바디를 내려주는 컨벤션이었다. 리뷰어(선우님·시현님)가 만든 패턴이라 거기 맞춰 `ProjectSuccessResponse`로 바꿨다.

## 재사용 vs 신규 — 한눈에

| 그대로 재사용 | 새로 만듦 |
|---|---|
| `MemberRole`(참여자 "파트") | `Project`/`ProjectImage`/`ProjectParticipant` 엔티티 |
| `AdminPrincipal`/`JwtAuthenticationFilter`(#117에서 이미 MEMBER role까지 일반화됨) | `ProjectService`/`ProjectController` |
| `/api/feed/images` 업로드 엔드포인트(이미지는 URL만 저장) | `ProjectSuccessResponse`(모듈별 경량 duplicate, Admin/Member와 같은 관례) |
| `Post`의 목록/상세 이원 DTO 패턴, `Member`의 부분수정 컨벤션 | — |

## 테스트 커버리지

`project` 패키지 17개 테스트(전체 스위트 203개, 회귀 0):
- 공개 목록·상세(숨김 프로젝트 제외, 대표 이미지 URL 노출, 존재하지 않는 id 404)
- 생성: 참여자로서 성공, 본인 미포함 400, 대표 이미지 2장 이상 400, MEMBER 아닌 역할 403, 미인증 401
- 수정: 참여자 성공, 비참여자 403, 참여자를 빈 배열로 시도 400
- 삭제: 참여자 성공(이후 조회 404), 비참여자 403
- 관리자 숨김: 성공 시 공개 목록·상세에서 제외, 멤버가 시도하면 403

## 아직 못 메꾼 것 / 다음 미션 후보

- 상세 설명·발표자료 필드(스펙에서 "처음엔 생략 가능"이라 명시 — 필요해지면 별도 미션)
- 이 PR은 #117 위에 스택돼 있다 — **머지 순서: #117 먼저, #119는 그다음**(또는 #117 머지 후 이 브랜치를 dev로 리베이스)
