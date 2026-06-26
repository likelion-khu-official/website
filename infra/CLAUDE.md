# 인프라 — 하네스 (골격)

> 골격. 인프라(장찬욱)/PM이 채워나간다.

## 시작 전 읽기
1. 루트 `CLAUDE.md`
2. `pm/docs/`: `learnings.md` → `brief.md`

## 오너십
배포(CI/CD)·백업·운영·사이트 생존. CI 워크플로는 루트 `.github/workflows/`.

## 역할 메모
- Walking Skeleton 단계에서 **day-1 배포** 책임(통합 리스크 조기 제거).
- 디자인·기능 안 기다림 — 파이프라인 먼저 뚫음.

## 무조건 0원 경계 — 오라클 Always Free (2026-06-26 기준)

> 우리 계정은 **PAYG**(capacity 우선순위 확보용). 한도 안이면 0원이지만 **넘으면 카드 과금**된다.
> 리소스 만들기 전 이 표와 대조. **무료티어 정책은 예고 없이 바뀐다** — 2026-06-15 A1이 4→2 OCPU로 반토막난 전례가 있으니 의심되면 재확인.

**지켜야 할 한도(이 중 하나라도 넘으면 0원 깨짐):**
- 컴퓨트: Ampere A1 합계 **2 OCPU / 12GB 이하**
- 스토리지: 부트+블록 **합계 200GB 이하** (부트볼륨 최소 50GB)
- 리전: **홈 리전(도쿄 `ap-tokyo-1`)에서만** 무료 — 다른 리전 리소스는 유료
- 공인 IP: Reserved 1개 + Ephemeral 무료 / LB: Flexible 1개(10Mbps) / egress: 10TB월 / Object Storage: 20GB

**조용히 과금되니 절대 만들지 말 것:**
- 🚨 **NAT Gateway** (Always Free 아님) → 퍼블릭 서브넷 + **Internet Gateway**(무료)로 해결
- A1 **4 OCPU/24GB** — capacity report에 `AVAILABLE`로 떠도 **만들 수 있다는 뜻이지 무료가 아님**
- Block Volume 200GB 초과 · Reserved Public IP 2개 이상

**1차 방어:** 예산 알림이 걸려 있으나(과금 시 메일), 체험 크레딧 소진 전엔 안 울릴 수 있다. → **한도 초과 자체를 안 하는 게** 가장 확실한 방어. `oci compute compute-capacity-report`로 가용성은 확인하되 무료 경계와 혼동하지 말 것.
