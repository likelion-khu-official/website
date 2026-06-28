# 결과 — #3 프론트 · 스택 선정 + 초기 셋업

> 미션이 닫힐 때 채운다. 재사용할 통찰은 `pm/docs/learnings.md`로 졸업(여기엔 이 미션 고유 결과만).

## 산출물
- **프론트 스택 확정 + 초기 골격** (PR #7, base=dev, 머지됨)
  - Next.js(App Router) + TypeScript + Tailwind CSS
  - frontend/ 스캐폴딩, 공통 layout, .gitignore(키·빌드 제외)

## 결정
- **Next.js + TS + Tailwind.**
  - 왜: SEO 중요한 콘텐츠 사이트(SSR/SSG) + Vercel 배포 핏 + Figma→코드 변환 호환.
  - shared/ 타입: 지금 손-작성 → BE(Java/Spring) 확정 후 OpenAPI→자동생성으로 교체(drift 방지).

## 후속 (비시급)
- 미사용 데모 SVG(file·globe·window) 정리 · SEO metadata/lang=ko · 와이어(#1) IA로 6라우트 골격 · 실제 카피/콘텐츠

## 배운 것
- → learnings 후보: 스캐폴딩 PR은 데모 잔재(보일러플레이트·미사용 에셋)를 남기기 쉬우니 위생 점검을 마감 체크에 포함.
