# 결과 — #115 백엔드 · 피드 글쓰기(로그인 세션 기반 작성)

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- PR [#139 "Feat/#115 feed"](https://github.com/likelion-khu-official/website/pull/139) — MERGED 2026-07-21. 매직링크 토큰 방식을 걷어내고 글 작성 API를 멤버 로그인 세션 기반으로 전환.
  - 매직링크 관련 파일 13개 삭제(엔티티·서비스·컨트롤러·리포지토리·DTO·예외 3종·테스트 2종), `GlobalExceptionHandler`·`SecurityConfig`에서 매직링크 경로 제거.
  - `PostController.create()` — `X-Magic-Token` 헤더 제거, `@AuthenticationPrincipal AdminPrincipal` + `@PreAuthorize("hasRole('MEMBER')")`로 교체. `PostService.createPost()`가 `memberRepository.findById()`로 Member 조회 후 `name`·`role`을 작성자로 파생.
  - `Post` 엔티티·`PostDetailResponse`·`PostSummaryResponse`에 `authorPart` 필드 추가. `SecurityConfig`에서 `GET /api/posts`·`GET /api/posts/*`만 공개, POST는 인증 필요로.
  - 수반 변경: `FeedImageController` `POST /api/feed/images`에 `@PreAuthorize("hasRole('MEMBER')")` 추가(글쓰기 흐름 일부). 댓글·이미지·글 테스트 픽스처가 삭제된 `MagicLinkTokenService`에 의존하던 부분을 `MemberRepository` 기반으로 교체(로직 자체는 무변경).
  - shared/ 계약: `PostCreateRequest` 주석에서 `X-Magic-Token` 참조 제거, `PostSummary`에 `authorPart: string | null` 추가.
  - 검증: `./gradlew test` 220/220 통과, Postman으로 멤버 로그인 후 글 작성 시 `authorName`·`authorPart` 자동 채움 / 비로그인 `POST /api/posts` 401 / 비로그인 `GET` 정상 확인.

## 결정
- (없음 — PM 확정 결정 기록 없음)

## 배운 것
- (없음)

## 후속 (PR #139 Open Questions — 미해결, @xhae123 @sunwoo1256)
- `authorPart` 다중 역할 처리: 현재 첫 번째 역할만 사용(`member.getRoles().stream().findFirst()`). 멤버가 여러 역할일 때 표시 정책 미확정.
- 글 작성 즉시 공개 여부: 현재 `POST /api/posts`는 `DRAFT`로 생성(어드민이 `PUBLISHED`로 올려야 공개). 미션 WHY의 "검수 없이 바로 공개" 문구와 어긋나며 Done 체크리스트엔 자동 공개 항목이 없어 구현에서 제외됨 — PM 확인 필요.
