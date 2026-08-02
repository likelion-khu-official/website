# 프론트엔드 — 하네스

## 시작 전 읽기
1. 루트 `CLAUDE.md`
2. `pm/docs/`: `learnings.md` → `brief.md`
3. `shared/` (FE↔BE API 타입)
- **UI·스타일 작업이면 `DESIGN.md`도 읽는다** — 디자인 언어(토큰 규칙·비주얼 언어·스켈레톤·모션). *lazy load — 스타일 건드릴 때만.*

## 스택
Next.js (App Router) · TypeScript · Tailwind CSS
- 이유: SEO 중요한 콘텐츠(소개·블로그·모집) 사이트 + Vercel 배포 핏 + Tailwind는 Figma→코드 변환 도구 호환성 좋음.

## 실행
- `cd frontend && npm ci && npm run dev` → localhost:3000. `/api/*`는 `BACKEND_URL`(기본 `http://localhost:8081`)로 rewrite.

## 오너십
화면 구현·API 연동·반응형·SEO. 페이지마다 통합 드라이버(디자인·BE를 당겨 페이지를 끝냄).

## shared/ 활용
- 백엔드는 Spring Boot로 확정됐다. FE↔BE 계약은 현재 `shared/types/*.ts`의 손으로 관리하는 TypeScript 타입이 정본이며 OpenAPI 자동 생성은 쓰지 않는다.
- API 응답·요청 DTO를 바꾸면 Spring DTO와 `shared/types`를 같은 변경에서 맞추고, 프론트는 그 타입으로 mock과 실제 연동을 함께 유지한다.

## 역할 메모
- 디자인·BE 완성 안 기다림 — 디자인 보이는 대로 + API mock으로 병렬.
- API 계약 변경은 BE와 합의(`shared/`).
