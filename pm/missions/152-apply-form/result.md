# 결과 — #152 FE · 새 부원이 지원하는 곳

## 산출물
- **PR [#261](https://github.com/likelion-khu-official/website/pull/261)** (base=dev, 리뷰어 신선우·안시현) — 지원폼 풀스택.
  - 계약 `shared/types/application.ts` — 질문 스키마 문법(공통/세션별 조건부) + 제출·관리자 목록 타입. `recruitment.ts`에 공개 상태 조회 추가.
  - BE `application` 도메인 — 폼 정의(싱글턴)+제출 2테이블(Flyway `V3`), 공개 `GET /api/application-form`·`POST /api/applications`, 관리자 `GET/PUT /api/admin/application-form`·`GET /api/admin/applications`, 공개 `GET /api/recruitment/status`. 신규 테스트 3클래스.
  - FE 공개 `/apply`(동적 폼·개인정보 동의·접수완료, 모집 닫힘 시 모집알림) + 랜딩 `Recruit` 연결, 관리자 폼 편집기·지원자 열람.
- 미션 Done 6개 전부 충족(IQ 게이트 통과). BE는 MockMvc 풀스택 테스트로 검증(동의 없으면 400·모집 닫힘 409·스냅샷·권한 403/401).

## 결정
- **폼 편집 방식 = 관리자 단순 편집기**(드래그드롭 아님, JSON 노출 아님). "연 1회 바뀌는 폼에 풀 빌더는 과하다(YAGNI)" + "운영진이 화면에서 직접 만들고 고친다"의 절충. RP 게이트에서 합의.
- **질문 정의는 BE가 파싱하지 않는다** — FE가 JSON 스키마로 정의하고 BE는 통째 저장. 제출 시 그 시점 스키마를 답변과 함께 **스냅샷**으로 박아, 다음 기수에 질문이 바뀌어도 옛 답변을 그때 질문으로 해석 가능(스펙 #125의 핵심 아키텍처 그대로).
- **동의는 서버에서도 강제** — `privacyConsent=false`면 접수 거부. 동의 없는 제출 레코드가 존재할 수 없어, 레코드 존재 자체가 동의 증적(#68 리뷰에서 지적했던 "UI-only 동의" 문제를 여기선 서버측으로 닫음).
- **공개 모집상태 엔드포인트 신설** — 기존 상태 조회는 admin 전용(구독자 수 포함)이라 그대로 공개 불가. 공개는 `open`만 반환.
- **개인정보 보관기간은 PM 결정([#217](https://github.com/likelion-khu-official/website/issues/217))** — 확정 전 임시 문구("모집 종료 후 6개월 뒤 파기").

## 배운 것
- **동의 게이트는 UI가 아니라 서버가 최종 방어자여야 한다** — FE 체크박스는 UX, 실제 강제는 API가. 지원자 개인정보처럼 민감한 수집일수록 "동의 없는 레코드는 애초에 못 만든다"로 설계하면 동의 증적이 데이터 그 자체가 된다. → `pm/docs/learnings.md` 졸업 후보.
- 로컬에 Java(JDK)가 없으면 백엔드 검증이 통째로 막힌다 — 이 레포는 Java 21 필요. `brew install openjdk@21` 후 `JAVA_HOME`만 잡으면 됨(사고 아님, 환경 준비물).
- 백엔드 라이브 소켓 E2E는 `ADMIN_SEED` 초대메일(SMTP/Mailpit) 의존이라 로컬에서 무겁다 — #145 QA가 택한 대로 **MockMvc 풀스택**이 이 레포의 실질 검증 경로다.
