# 인프라 — 하네스

> 오너: 장찬욱(@cjang3285)

## 시작 전 읽기
1. 루트 `CLAUDE.md`
2. `pm/docs/`: `learnings.md` → `brief.md`

## 오너십
배포(CI/CD) · 서버 운영 · 사이트 생존. CI/CD 워크플로는 `.github/workflows/`.

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

**capacity 운영 팁:** Ampere가 `OUT_OF_HOST_CAPACITY`면 오라클 재고 부족(우리 탓 아님)이고 수시로 풀린다. → 작은 shape(1 OCPU)로 **자리부터 선점**한 뒤, 풀리면 `oci compute instance update --shape-config`로 한도(2/12)까지 **resize**(재생성 없이 재부팅만). 무료계정은 capacity 우선순위가 낮아 인기 리전 Ampere가 잘 안 잡히니 **PAYG가 사실상 필수**(한도 내 0원 유지).

---

## 아키텍처

```
GitHub Actions
  PR to dev/main → CI (테스트)
  dev 머지 → CD → stage 이미지 빌드 → OCI backend-stage 서비스 재시작
  main 머지 → CD → prod 이미지 빌드 → OCI backend-prod 서비스 재시작
  ※ CD 트리거 paths 필터: backend/**, shared/** — infra/ 변경만으로는 CD 안 돌아감

OCI 인스턴스 (168.138.202.82, arm64 Ampere A1)
  docker compose (단일 파일: infra/docker-compose.yml)
    ├── nginx (80/443)       → backend-stage:8080 / backend-prod:8080 (Docker 내부 네트워크)
    ├── backend-stage        → STAGE_TAG 변수 (기본: stage-latest)  (host:8081 → container:8080)
    └── backend-prod         → PROD_TAG 변수 (기본: prod-latest)    (host:8080 → container:8080)
  ※ STAGE_TAG / PROD_TAG 분리 — stage 배포 시 STAGE_TAG만 세팅, prod는 건드리지 않음

GHCR (이미지 레지스트리)
  backend:stage-{sha} / backend:stage-latest
  backend:prod-{sha} / backend:prod-latest

Vercel → 프론트엔드 (인프라 무관)
```

## 브랜치 ↔ 환경 대응

| 브랜치 | CI 트리거 | CD 트리거 | 환경 | 서비스 | 포트 |
|---|---|---|---|---|---|
| `dev` PR | ✅ | — | — | — | — |
| `dev` 머지 | — | ✅ | stage | backend-stage | 8081 |
| `main` PR | ✅ | — | — | — | — |
| `main` 머지 | — | ✅ | prod | backend-prod | 8080 |

---

## 파일 목록

| 파일 | 용도 |
|---|---|
| `.github/workflows/ci.yml` | PR 시 백엔드 테스트 실행 + PR 코멘트 |
| `.github/workflows/cd.yml` | 이미지 빌드·푸시 → OCI 배포 → 헬스체크 → 스모크 테스트 → 실패 시 롤백 |
| `infra/docker-compose.yml` | OCI 전체 스택 (nginx + backend-stage:8081 + backend-prod:8080) |
| `infra/nginx.conf` | nginx 설정 — 서버에만 존재 (gitignore), 도메인 확정 후 작성 |
| `infra/.env.stage.example` | stage 환경변수 템플릿 |
| `infra/.env.prod.example` | prod 환경변수 템플릿 |
| `infra/data/` | SQLite DB 파일 — 서버에만 존재 (gitignore), `mkdir -p data/`로 생성 |

---

## OCI CLI 세팅 (장찬욱 로컬, 2026-06-25 완료)

- **설치**: Windows에 Python venv 기반으로 설치 (`~/bin/oci`)
- **자격증명 위치**: `~/.oci/config` + `~/.oci/oci_api_key.pem` (로컬에만, 레포에 없음)
- **IAM**: Administrators 그룹 소속 계정 — OCID·fingerprint는 `~/.oci/config` 참조
- **홈 리전**: `ap-tokyo-1`
- **PATH**: 사용자 환경변수에 영구 등록 완료
- **주의**: OCI CLI는 PowerShell에서 JSON 인자 인코딩 문제가 있음 → JSON 인자 포함 명령은 **Bash로 실행**

---

## OCI 현재 네트워크 상태 (2026-06-25 세팅 완료)

| 리소스 | 이름 | 상태 |
|---|---|---|
| VCN | `likelion-VCN` (10.0.0.0/16) | AVAILABLE |
| 서브넷 | `likelion-subnet` (10.0.0.0/24, 퍼블릭) | AVAILABLE |
| 인터넷 게이트웨이 | `likelion-igw` | AVAILABLE |
| 라우트 테이블 | Default (`0.0.0.0/0 → IGW` 연결됨) | AVAILABLE |
| 보안 리스트 | Default | AVAILABLE |

**보안 리스트 인바운드 오픈 포트**: 22(SSH), 80(HTTP), 443(HTTPS)

**인스턴스**: `168.138.202.82` (ubuntu@, arm64 Ampere A1, 2 OCPU/12GB) — 운영 중
- `OCI_DEPLOY_PATH` = `/home/ubuntu/website/infra`
- `~/.ssh/oci_server.pem` (장찬욱 로컬, SSH 접속용) / `ssh likelion-oci`로 접속

> OCID 등 민감 정보는 `~/.oci/config` 또는 OCI 콘솔에서 확인

---

## OCI 초기 세팅 (한 번만)

1. `OCI_DEPLOY_PATH` 디렉터리 생성 + git clone
2. `infra/nginx.conf` 작성 (도메인 확정 후 — Let's Encrypt SSL 설정 포함)
3. `infra/.env.stage`, `infra/.env.prod` 작성 (`.env.stage.example` 참고, 백엔드가 확정하는 환경변수)
4. `mkdir -p infra/data/` — SQLite DB 디렉터리 생성
5. `docker login ghcr.io` — GHCR pull 권한
6. `docker compose -f infra/docker-compose.yml up -d` — 전체 스택 초기 실행
7. OCI Security List: 포트 8080, 8081 오픈 (헬스체크·디버깅용)

## GitHub Secrets 목록

| Secret | 내용 |
|---|---|
| `OCI_HOST` | 인스턴스 IP |
| `OCI_USER` | SSH 유저 (`ubuntu`) |
| `OCI_SSH_KEY` | SSH 프라이빗 키 |
| `OCI_DEPLOY_PATH` | compose 파일 위치 (예: `/home/opc/app`) |

---

## 롤백

CD 실패 시 자동 롤백. 수동 롤백이 필요하면:
```bash
# stage
STAGE_TAG=stage-abc1234 docker compose -f docker-compose.yml up -d backend-stage

# prod
PROD_TAG=prod-abc1234 docker compose -f docker-compose.yml up -d backend-prod
```

## 미결 사항
- 스모크 테스트 엔드포인트 (백엔드 구현 후 `cd.yml`에 추가)
- nginx server_name + SSL (도메인 구매 후 — 현재 IP 직접 접속만 가능, 80포트 전부 prod로 감)
- SQLite 백업 (단일 노드에 DB가 같이 있어서 노드 장애 = 데이터 유실 위험)
