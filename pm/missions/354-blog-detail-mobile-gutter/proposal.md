# 제안 — #354 블로그 상세 모바일 좌우 여백 복구

## Target

Story [#185 방문자가 블로그 글 상세를 본다](https://github.com/likelion-khu-official/website/issues/185)를 다시 완성 상태로 만드는 FE Sub-task다.

## Deliverable

- 글 상세의 제목·본문·댓글에 모바일 안전 여백을 제공한다.
- 로딩·오류·없는 글 상태에도 같은 컨테이너 규칙을 적용한다.
- 데스크톱의 실제 본문 최대 너비는 유지한다.

## Why it matters

긴 글을 읽는 화면에서 콘텐츠가 모바일 화면 가장자리에 붙으면 가독성이 크게 떨어지고 목록에서 상세로 이동할 때 레이아웃 기준도 끊긴다. 공통적인 좌우 안전 여백을 복구하는 것이 우선이다.

## Done

GitHub 이슈 #354의 완료 기준을 따른다. 본문 typography와 Markdown 렌더링은 변경하지 않는다.
