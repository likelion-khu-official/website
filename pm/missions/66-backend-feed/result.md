# 결과 — #66 백엔드 · 피드(블로그) 백엔드 — 글·댓글 API + 계약

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.
> 어사인: 신선우(@sunwoo1256)·안시현(@xihxxn) · 발주 7/2 · 목표 7/5 · 실제 머지 7/6(PR #79)

## 산출물

두 PR로 갈라 들어왔다.

- **PR #73** — 매직링크 토큰(`POST/GET /api/feed/tokens`) + 피드 이미지 업로드(`POST /api/feed/images`). 토큰은 24h TTL·1회용(`consume()`이 `used=true` 찍고 작성자명 반환), 이미지는 jpg·png·webp·gif·5MB 제한.
- **PR #79** — 글·댓글 CRUD + `shared/types/feed.ts` 계약.
  - 글: `POST /api/posts`(매직토큰 헤더 `X-Magic-Token`), 공개 목록·개별(`GET /api/posts`, `/{slug}` — **PUBLISHED만**), 어드민 전체 목록(`/api/admin/posts`), 상태 전이(`PATCH /api/admin/posts/{id}/status`).
  - 상태 화이트리스트: DRAFT→PUBLISHED→HIDDEN→PUBLISHED. 최초 발행 시 `publishedAt` 세팅 후 **보존**(재발행해도 안 덮음) — #58 확정사항대로.
  - 댓글: 익명 작성·조회(`/api/posts/{postId}/comments`), 운영진 숨김(`.../admin/{commentId}/hide`), 목록은 `hidden=false`만.
  - 계약: Post·Comment·매직링크·이미지 전 타입 + `SpringPage<T>` 페이지 래퍼까지 프론트가 그대로 붙게.
  - 테스트: Post/Comment 서비스·컨트롤러 4개 테스트 클래스 동반.

## 결정

- **미션 완료로 판정.** Deliverable이 "API까지, 어드민 인증/검수 UI는 범위 밖"이라 명시했고, Done 5개 중 4개(글 흐름·매직링크·댓글·계약)가 코드로 확인됨. 5번(stage 한 줄 검증)은 런타임 미확인이나 코드상 성립 — 배포 검증은 프론트가 붙을 때 실물로 드러난다.
- **잔여 보안 부채는 #74로 승계.** 아래 리스크 참조. 미션 #66의 흠이 아니라 설계상 #74가 받기로 한 몫이라, 여기서 막지 않고 #74에 명시 연결.

## 리스크 (승계 대상)

지금 `SecurityConfig`가 어드민·매직링크 엔드포인트를 전부 `permitAll`로 임시 개방. 코드에 `TODO: 운영진 인증 도입 시 좁히기`가 달려 있고, 좁히는 주체는 #74(어드민 파운데이션).

- `/api/admin/posts/**`(발행·숨김), `/api/posts/*/comments/**`(댓글 숨김) → 인증 없이 **아무나 글 발행/숨김·댓글 숨김 가능**.
- `POST /api/feed/tokens` → **아무나 토큰 발급 → 글 작성**(스팸 벡터).

→ **#74가 닫히기 전엔 이 상태로 prod 노출 금지.** #74 완료 조건에 "이 두 그룹을 운영진 전용으로 좁힌다"가 포함돼야 함(이슈에 코멘트로 명시).

## 배운 것

- 계약 우선(`shared/types/feed.ts`) 병렬 개발이 실제로 돌았다 — 프론트(#78)가 백엔드 완료를 안 기다리고 타입만 보고 붙을 수 있게 됨. → learnings 졸업.
- `permitAll` 임시 개방이 도메인마다 쌓여 SecurityConfig가 "TODO 무덤"이 되고 있다 — 인증을 뒤로 미루는 대가는 한곳에 모인 부채. → learnings 졸업.
