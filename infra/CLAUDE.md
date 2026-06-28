# 인프라 — 하네스

> 오너: 장찬욱(@cjang3285)

## 시작 전 읽기
1. 루트 `CLAUDE.md`
2. `pm/docs/`: `learnings.md` → `brief.md`

## 오너십
배포(CI/CD) · 서버 운영 · 사이트 생존. CI/CD 워크플로는 `.github/workflows/`.

---

## 아키텍처

```
GitHub Actions
  PR to dev/main → CI (테스트)
  dev 머지 → CD → stage 이미지 빌드 → OCI backend-stage 서비스 재시작
  main 머지 → CD → prod 이미지 빌드 → OCI backend-prod 서비스 재시작

OCI 인스턴스
  docker compose (단일 파일: infra/docker-compose.yml)
    ├── nginx (80/443)       → backend-stage:8080 / backend-prod:8080 (내부 네트워크)
    ├── backend-stage        → backend:stage-latest  (host:8081 → container:8080)
    └── backend-prod         → backend:prod-latest   (host:8080 → container:8080)

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

**인스턴스**: 아직 없음 — 네트워크 뼈대만 완성된 상태

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
| `OCI_USER` | SSH 유저 (기본: `opc`) |
| `OCI_SSH_KEY` | SSH 프라이빗 키 |
| `OCI_DEPLOY_PATH` | compose 파일 위치 (예: `/home/opc/app`) |

---

## 롤백

CD 실패 시 자동 롤백. 수동 롤백이 필요하면:
```bash
# stage
BACKEND_TAG=stage-abc1234 docker compose -f docker-compose.yml up -d backend-stage

# prod
BACKEND_TAG=prod-abc1234 docker compose -f docker-compose.yml up -d backend-prod
```

## 미결 사항
- DB 종류 미정 (백엔드 결정) → `.env.prod/.env.test` 완성 후 compose에 반영
- 스모크 테스트 엔드포인트 (백엔드 구현 후 `cd.yml`에 추가)
- nginx conf 도메인 (도메인 구매 후 작성)
- Spring Boot Actuator 의존성 (백엔드가 `build.gradle`에 추가해야 헬스체크 작동)
