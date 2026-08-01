# 진행 로그 — #349 게시글 익명 댓글 UI/UX 개선

## Research

- 최초 피드 FE 미션 #78은 복잡한 상호작용을 기능부터 만들고 디자인을 후행하기로 했으며, 현재 댓글 화면은 그 최소 구현이 남아 있는 상태다.
- 댓글 계약은 닉네임 선택 50자, 내용 필수 300자, 가려진 댓글의 nickname/content null을 이미 제공하므로 FE만으로 완료 기준을 충족할 수 있다.
- 기존 화면은 로딩 중에도 POST가 가능해 초기 GET 결과가 등록 직후 상태를 덮을 수 있고, 가려진 자리표시자까지 헤더 개수에 포함한다.

## Plan

- `CommentSection.tsx`: 작성 영역을 목록 앞의 독립 composer로 만들고 초기 조회 전 비활성화한다. 공개 댓글만 개수에 포함하고, 목록은 기존 응답 순서를 그대로 유지한다.
- 입력에 보이는 label과 설명 연결을 추가하고 성공은 status, 실패는 alert로 전달한다. 시간은 `time` 요소에 날짜·시각을 함께 제공한다.
- `CommentSection.test.tsx`: 로딩 경합 방지, 공개/가려짐 렌더, 재시도, 성공·실패, 입력 보존과 글자 제한을 검증한다.
- backend/shared와 범위 밖 기능은 건드리지 않는다.

사용자가 연구·계획부터 구현·QA·PR까지 일괄 승인하고 PR을 리뷰 표면으로 정했으므로 RP·IQ 게이트는 멈추지 않고 진행한다.

## Implementation · QA

- 작성 composer를 목록 앞에 배치하고 초기 조회가 끝날 때까지 fieldset 전체를 비활성화했다.
- 댓글 개수는 `hidden=false`만 세고, 가려진 댓글은 닉네임·원문 대신 자리표시자만 렌더한다.
- 등록 성공은 status, 실패와 조회 오류는 alert로 전달하며 실패 입력을 보존한다.
- 댓글 단위 테스트 6개, FE 전체 테스트 43개, ESLint, Next.js production build가 통과했다.
- 독립 PR [#351](https://github.com/likelion-khu-official/website/pull/351)을 `dev` 대상으로 열었다. 이슈는 리뷰·병합 때 `Closes #349`로 닫힌다.
