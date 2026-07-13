> 🔗 이슈: https://github.com/likelion-khu-official/website/issues/94
> ⚙️ 필드: 제목 `[BE] 피드 글쓰기 — 매직링크 걷어내고, 자유작성+검수로 전환 (~7/18)` · 어사인 신선우(@sunwoo1256)·안시현(@xihxxn) · 요청자 김우진 · 라벨 roadmap, 백엔드 · 시작일 2026-07-10 · 목표일 2026-07-18(토)
> 아래가 이슈 본문입니다.

---

> 먼저 — **방금 매직링크로 다 만들었는데 다시 걷어내게 해서 미안해요.** 🙏
> 매직링크가 틀린 게 아니라, 팀 논의에서 "부원이 번거로우면 글을 안 쓴다"가 크게 나와서 더 가벼운 방식으로 방향을 틀었어요. 이미 만든 게 헛수고도 아니에요 — **검수 상태기계·이미지 업로드·글 CRUD는 그대로 살아요.** 걷어내는 건 매직링크 부분뿐이에요.
>
> 배경·왜 이 방식인지: PR #93 (`pm/docs/feed-write-policy.md`)에 대안 검토까지 다 있어요.

이 이슈는 **그대로 Claude Code에 붙여 실행**할 수 있게 썼어요. 저장소 안에서 `pm/docs/feed-write-policy.md`랑 `pm/onboarding/dev-monorepo-ai.md` 먼저 읽고 시작하면 돼요.

---

## 제품 관점 — 글쓰기가 이렇게 바뀌어요

**지금(매직링크):** 부원이 "글 쓸래요" → 운영진이 1회용 링크 발급(이름도 이때 지정) → 그 링크로 글 씀 → 검수 후 게시.
**바뀌면:** 부원이 글쓰기 버튼 그냥 누름 → 멤버 명단에서 본인 고름(이름·파트 자동) → 제목·본문 쓰고 제출 → 검수 후 게시.

작성자 이름·파트는 **프론트가 멤버 명단에서 고른 걸 문자열로 보내줘요.** 백엔드는 그 문자열만 받으면 돼요 — 멤버 테이블이랑 안 엮어요(그래야 멤버 API #76 안 기다리고 지금 나가요).

---

## 무엇을 하나요 (변경 스펙)

### 1. 계약 먼저 — `shared/types/feed.ts`
이걸 **먼저 머지**해두면 프론트(#다음 미션)가 안 기다리고 붙여요.
```ts
export type AuthorPart = 'PLANNING' | 'DESIGN' | 'FRONTEND' | 'BACKEND' | 'INFRA';

export interface PostCreateRequest {
  authorName: string;      // 신규 (≤50). 프론트가 고른 멤버 이름
  authorPart: AuthorPart;  // 신규. 고른 멤버 역할
  title: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
}
// PostSummary·PostDetail 에 authorPart: AuthorPart 추가
// 삭제: MagicLinkTokenIssueRequest / MagicLinkTokenIssueResponse / MagicLinkTokenStatusResponse
// 유지: FeedImageUploadResponse (이미지 업로드는 안 건드림)
```

### 2. 작성 엔드포인트 — `feed/post/PostController.java` · `PostService.java`
- `POST /api/posts`에서 `@RequestHeader("X-Magic-Token")` **제거.** 시그니처를 `create(@Valid @RequestBody PostCreateRequest)`로.
- `PostService.createPost`에서 `magicLinkTokenService.consume(...)` **제거.** `authorName`·`authorPart`를 request에서 바로 꺼내 저장. 저장 상태는 **그대로 `DRAFT`**, 201.
- `PostService`의 `MagicLinkTokenService` 필드 의존 제거.

### 3. 엔티티 — `feed/post/Post.java` + 새 enum
- `Post`에 `authorPart` 필드 추가 (`@Enumerated(EnumType.STRING)`, `nullable=false`). `Post.create(...)` 시그니처에 반영.
- `feed/post/AuthorPart.java` enum 신규 (`PLANNING·DESIGN·FRONTEND·BACKEND·INFRA`). DB는 `ddl-auto: update`라 컬럼 자동 추가.

### 4. 응답 DTO — `PostSummaryResponse.java` · `PostDetailResponse.java`
- 둘 다 `authorPart` 필드 + `from(...)` 매핑 추가.

### 5. 매직링크 전부 삭제 (`feed/` 아래)
- `MagicLinkToken.java`, `MagicLinkTokenRepository.java`, `MagicLinkTokenController.java`, `MagicLinkTokenService.java`
- `dto/MagicLinkTokenIssueRequest.java`, `dto/MagicLinkTokenIssueResponse.java`, `dto/MagicLinkTokenStatusResponse.java`
- `exception/MagicLinkTokenAlreadyUsedException.java`, `MagicLinkTokenNotFoundException.java`, `MagicLinkTokenExpiredException.java`
- 테스트 `MagicLinkTokenControllerTest.java`, `MagicLinkTokenServiceTest.java`
- (이미지·댓글은 그대로 둬요)

### 6. 보안 — `config/SecurityConfig.java`
- `.requestMatchers("/api/feed/tokens/**").permitAll()` 줄 삭제. `/api/posts/**` 주석의 "매직링크 제출" 문구 정리. 나머지 permitAll(posts·images·comments·admin)은 #74 인증까지 유지.

### 7. 테스트
- `PostControllerTest`·`PostServiceTest`를 새 시그니처(헤더 없음, 본문에 authorName·authorPart)로 갱신.

---

## 왜 하나요
매직링크는 "쓰고 싶다 → 운영진이 링크 줌 → 그제서야 씀"이라 번거로워요. 부원이 번거로우면 글을 안 써요. 링크 게이트는 어차피 있는 관리자 검수랑 겹치고요. 대안(OTP·비번·긁어오기·무검수)을 다 따진 근거는 PR #93.

## 다 됐다는 기준
- [ ] `POST /api/posts`가 헤더 없이 `{authorName, authorPart, title, content}`로 201, 글은 `DRAFT`
- [ ] `authorName`/`authorPart` 누락 시 400
- [ ] `PostSummary`/`PostDetail` 응답에 `authorPart` 포함
- [ ] 코드베이스에 `MagicLink` 참조 0건, 컴파일·기존 테스트 그린(매직 테스트는 삭제)
- [ ] `shared/types/feed.ts` 갱신 머지(매직 타입 3종 제거)

## 경계 (건드리지 마세요)
- 검수 상태기계(`DRAFT→PUBLISHED→HIDDEN`)·어드민 API(`PATCH /api/admin/posts/{id}/status`)는 **이미 있으니 그대로.** 검수는 재사용이지 신규 개발 아님.
- 봇 가드·rate-limit·OTP·인증은 범위 밖(#74·후속).
- 멤버 엔티티와 결합하지 않음 — `authorName`/`authorPart`는 검증 없는 문자열(진짜 멤버인지는 프론트 드롭다운이 챙김).
- `posts`에 기존 레코드가 있으면 `NOT NULL` 컬럼 추가가 실패할 수 있어요 → 실데이터 없으니 비우고 진행, 있으면 PM(@xhae123)에 알려주세요.
