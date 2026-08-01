# 결과 — #350 프로젝트 목록 UI/UX 개선

> PR 리뷰가 끝나면 확정되는 결과 상자다.

## 산출물

- 리뷰 PR: [#352](https://github.com/likelion-khu-official/website/pull/352)
- `/projects`의 압축 hero, lead project, 반응형 가로 카드 목록, 빈 상태·오류 복구 UI
- 프로젝트 카드·목록 상태 컴포넌트 테스트 10개

## 결정

- 현재 6개·단일 기수 데이터에는 검색이나 기수 필터를 넣지 않았다. 실제 프로젝트를 더 빨리 보는 것이 이번 문제의 핵심이기 때문이다.
- 대표 이미지는 장식 사진이 아니라 서비스 화면이므로 가로 프레임에서 `object-contain`으로 전체를 보존했다.

## 배운 것

- 대표 이미지처럼 입력 URL에 따라 실패 상태를 초기화해야 하는 컴포넌트는 render 중 상태를 맞추기보다 URL을 포함한 `key`로 이미지 경계를 다시 마운트하면 흐름이 단순하고 예측 가능하다.

## 검증

- 전체 FE 단위·컴포넌트 테스트: 10개 파일, 47개 테스트 통과
- ESLint 통과
- Next.js production build와 TypeScript 검사 통과
- stage API의 6개 실제 프로젝트를 연결한 production SSR에서 lead card와 전체 목록 렌더 확인
