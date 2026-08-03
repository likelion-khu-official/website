# 멋쟁이사자처럼 경희대 공식 사이트 — 프론트엔드

Next.js App Router 기반의 공개 사이트와 관리자 화면입니다. 제품 동작의 정본은 [서비스 위키](https://github.com/likelion-khu-official/website/wiki), 화면 구현 원칙은 [`DESIGN.md`](DESIGN.md), API 계약은 [`shared/types`](../shared/types/)에서 확인합니다.

## 로컬 실행

Node.js 20과 npm을 사용합니다.

```bash
npm ci
npm run dev
```

브라우저에서 <http://localhost:3000>을 엽니다. `/api/*` 요청은 기본적으로 `http://localhost:8081`의 백엔드로 전달됩니다. 다른 백엔드를 쓰려면 `frontend/.env.local`에 다음 값을 둡니다.

```dotenv
BACKEND_URL=http://localhost:8080
```

페이지는 `src/app/`, 재사용 컴포넌트는 `src/components/`, API 호출은 `src/lib/api.ts`에서 시작합니다.

## 검증

```bash
npm run lint
npm run test
npm run build
```

브라우저 E2E는 Playwright 브라우저와 별도로 실행 중인 백엔드가 필요합니다.

```bash
npx playwright install chromium
npm run test:e2e
```

## 배포

Vercel이 프론트엔드를 배포합니다. `dev`는 stage, `main`은 prod에 대응하며 백엔드 배포 구조와 운영 주소는 [`pm/docs/ops.md`](../pm/docs/ops.md)를 따릅니다.
