# 결과 — #354 블로그 상세 모바일 좌우 여백 복구

## 산출물

- `/blog/[slug]`의 제목·본문·댓글에 모바일 20px, 큰 화면 40px 좌우 안전 여백을 적용했다.
- loading·error·not-found도 같은 848px 바깥 셸과 반응형 padding을 사용한다.
- 라우트 테스트로 모바일 여백과 데스크톱 본문 폭 보존 규칙을 고정했다.

## 결정

- 기존 `max-w-3xl`에 padding만 추가하지 않고 바깥 최대 너비를 848px로 늘렸다. 40px 좌우 padding을 빼고도 기존 768px 본문 폭을 유지하기 위해서다.
- 블로그 공통 layout에는 여백을 넣지 않았다. 목록 화면이 이미 자체 padding을 가져 중복 여백이 생기기 때문이다.

## QA

- `npm test` — 14 files, 62 tests 통과.
- `npm run lint` — 통과.
- `npm run build` — TypeScript 검사와 Next.js production build 통과.

## 배운 것

최대 너비와 padding을 같은 박스에서 사용할 때 실제 콘텐츠 폭이 줄어드는 점을 `pm/docs/learnings.md`에 재사용 가능한 규칙으로 남겼다.
