# 프론트엔드 — 하네스

## 시작 전 읽기
1. 루트 `CLAUDE.md`
2. `pm/docs/`: `learnings.md` → `brief.md`
3. `shared/` (FE↔BE API 타입)

## 스택
Next.js (App Router) · TypeScript · Tailwind CSS
- 이유: SEO 중요한 콘텐츠(소개·블로그·모집) 사이트 + Vercel 배포 핏 + Tailwind는 Figma→코드 변환 도구 호환성 좋음.

## 실행
- `cd frontend && npm install && npm run dev` → localhost:3000

## 오너십
화면 구현·API 연동·반응형·SEO. 페이지마다 통합 드라이버(디자인·BE를 당겨 페이지를 끝냄).

## shared/ 활용
- BE 스택(FastAPI/Gin 등) 확정 전: FE가 `shared/`에 TS interface 초안 작성 → mock으로 개발.
- BE 스펙 확정 후: BE가 노출하는 OpenAPI 스펙 → `openapi-typescript`로 타입 자동 생성, 손-작성 interface 교체.

## 역할 메모
- 디자인·BE 완성 안 기다림 — 디자인 보이는 대로 + API mock으로 병렬.
- API 계약 변경은 BE와 합의(`shared/`).
