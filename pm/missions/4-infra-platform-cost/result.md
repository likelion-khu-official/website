# 결과 — #4 인프라 · 배포 플랫폼 선정 + 월 비용 추정

> 미션이 닫힐 때 채운다. 재사용할 통찰은 `pm/docs/learnings.md`로 졸업시킨다(여기엔 이 미션 고유의 결과만).

## 산출물
- **오라클 클라우드 도쿄 테넌시** `kwj_likelion` (owner 김우진, PAYG)
- **운영 서버** `likelion-prod` — A1.Flex **2 OCPU/12GB**, Ubuntu 24.04 ARM, 공인IP `168.138.202.82`, RUNNING
- **네트워크** VCN + 퍼블릭 서브넷 + Internet Gateway (NAT 없음 = 과금 회피)
- **무료 경계 하네스** `infra/CLAUDE.md` (PR #6)
- **권한** 장찬욱 IAM Administrators 위임 + 서버 SSH 키 전달

## 결정
- **플랫폼 = 오라클 Always Free + PAYG.** 타사(AWS·GCP·Azure) 동급 월 ~12만원 대비 **0원**.
  무료계정은 capacity 우선순위가 낮아 Ampere가 안 잡혀서(`OUT_OF_HOST_CAPACITY`) PAYG로 전환 —
  **한도 내는 PAYG여도 과금 0**이라 0원은 유지, capacity 우선순위만 확보.
- **리전 = 도쿄(`ap-tokyo-1`)**, 홈 리전 1회 고정. (서울은 신규 무료계정에 AD 1개·capacity 빡셈)
- **계정 명의·결제 = 김우진 개인** (동아리 공용 체크카드 없음).
- **월 비용 = 0원** (실비용은 도메인 연 1~2만원만). 자바 vs Go 비용차 무의미 → 언어는 팀 선호로(#2).

## 배운 것
- 미션 고유 결과는 위. 재사용 통찰(무료티어 예고없이 깎임 · 무료계정 capacity 우선순위 · "available≠무료" ·
  0원은 부수 리소스까지)은 `learnings.md`로 졸업 완료.

## 후속 (보류 — 별도 미션/이슈로)
- **운영 구성**: 도커 자원제한 · DB 백업 · keepalive(idle reclaim 방어) · CI/CD
- **도메인** 구매(호스팅kr) + DNS 연결
- **장찬욱 실제 접속/조작 검증** (키 전달만 완료, 그쪽 성공은 미확인)
