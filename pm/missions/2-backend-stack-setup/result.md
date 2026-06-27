# 결과 — #2 백엔드 · 스택 선정 + 초기 셋업

> 미션이 닫힐 때 채운다. 재사용할 통찰은 `pm/docs/learnings.md`로 졸업(여기엔 이 미션 고유 결과만).

## 산출물
- **백엔드 스택 확정 + 초기 골격** (PR #10, base=dev)
  - Java + Spring Boot, Gradle 빌드, application.yml, 기본 Application/테스트
  - backend/.env.example (시크릿 제외)

## 결정
- **언어 = Java / 프레임워크 = Spring Boot.**
  - 왜: 팀 전원 Java 익숙 → 학습곡선 0, 속도. 1학기 Java 경험으로 협업·트러블슈팅 노하우 축적.
  - 비용 우려 해소: 인프라(장찬욱) 검증 — OCI Free 12GB vs JVM ~500MB → 비용 차 무의미 → "차 작으면 Java" 조건 충족.

## 후속
- shared/ 계약(FE↔BE 타입) 프론트와 맞추기 · 기능별 API 구현 · DB 연동

## 배운 것
- → learnings 후보: 스택 결정은 단독이 아니라 인프라 비용 검증을 입력으로 받아야 정당화된다(팀 간 근거 연결).
