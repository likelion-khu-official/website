# 결과 — #78 피드(블로그) 프론트 — 글 작성·조회 전체 기능

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- `/blog` 목록(페이지네이션·로딩·빈·에러), `/blog/[slug]` 상세(OG 태그·404·댓글·XSS 방어), `/blog/write` 작성(매직링크 토큰 4상태·이미지 업로드 진행률·임시저장·미리보기). **PR #89 머지.**
- SSR 셀프-fetch 패턴(`getBaseUrl` — `headers()`로 자기 절대 URL), `feedApi` 계층, `shared/types/feed` import.
- 박일하 리뷰 통과 — 초기 `frontend/src/types/feed.ts`로 계약을 **복사**했다가(drift 위험) 지적받고 `@shared/types/feed` import로 수정.

## 결정
- **디자인-후행** — 기능부터 다 세우고 디자인은 이후 피드백(피드는 상호작용이 복잡해 시안부터면 끝이 없음).
- 계약은 문서가 아니라 `shared/` 코드에서 import.
- **★ 작성 흐름의 매직링크는 정책 전환으로 폐기** — "부원이 번거로우면 안 쓴다"가 커서 자유작성+멤버선택+검수로 선회(PR #93). **재작업: #94(BE)·#95(FE).** 목록·상세·댓글·이미지·미리보기는 그대로 살아 헛수고 아님.

## 배운 것
- 계약을 복사하면 drift — import로(이미 learnings 졸업). SSR 셀프-fetch 절대URL 패턴(이미 learnings 졸업). → 추가 졸업 없음.
