# 결과 — #6 프론트 · 모집 알림 수직 관통 (walking skeleton)

> 미션이 닫힐 때 채운다. 재사용할 통찰은 `pm/docs/learnings.md`로 졸업시킨다(여기엔 이 미션 고유의 결과만).

## 산출물
- **랜딩 + 모집 알림 수직 슬라이스** (PR #42, base=dev, 머지됨)
  - `frontend/src/app/page.tsx` — 헤더/히어로/모집 섹션/푸터 랜딩
  - 6섹션 라우트 뼈대: `activities·blog·members·projects·recruit/page.tsx`
  - `NotificationForm.tsx` — 이메일 폼이 실제로 `POST /api/notifications/subscribe` 호출(mock 아님)
  - `next.config.ts` rewrite 프록시(`BACKEND_URL`)로 백엔드와 한 도메인 통합
  - shared 계약 `shared/types/notification.ts`(PR #41 머지) 위에 프론트 타입 일치

## 결정
- **디자인→FE→계약→BE를 한 줄로 관통.** 라우트 나열이 아니라 **계약(shared)을 먼저 열어** 백엔드를 그 위로 모으는 방식 — "핸드오프 릴레이 대신 계약 먼저" 원칙의 실증.
- **rewrite 프록시로 CORS 제거 + 백엔드 주소 은닉** (서버↔서버 통신). → learnings의 프록시 통찰과 일치.

## 후속 (비시급)
- **라이브 URL end-to-end 확인**(Vercel 배포 주소에서 폼 제출 1회 실저장) — 레포만으로 미검증
- 알림 타입 **3중 수동 동기화**(shared·frontend/types·BE DTO) → OpenAPI 자동생성 전환
- 잔재 위생: 미사용 데모 SVG 제거 · `layout.tsx` `lang=en`→`ko`

## 배운 것
- → learnings 후보: walking skeleton의 성패는 "라우트 개수(output)"가 아니라 **양 팀을 계약으로 끌어들인 통합(outcome)** 이 코드로 관통됐는가로 본다.
