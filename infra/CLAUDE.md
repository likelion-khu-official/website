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
  dev 머지 → CD → test 이미지 빌드 → OCI test 스택
  main 머지 → CD → prod 이미지 빌드 → OCI prod 스택

OCI 인스턴스
  native nginx (80/443)
    ├── test-api.domain.com → localhost:8081
    └── api.domain.com     → localhost:8080
  docker compose (test)  → backend:test-latest  (8081)
  docker compose (prod)  → backend:prod-latest  (8080)

GHCR (이미지 레지스트리)
  backend:test-{sha} / backend:test-latest
  backend:prod-{sha} / backend:prod-latest

Vercel → 프론트엔드 (인프라 무관)
```

## 브랜치 ↔ 환경 대응

| 브랜치 | CI 트리거 | CD 트리거 | 환경 | 포트 |
|---|---|---|---|---|
| `dev` PR | ✅ | — | — | — |
| `dev` 머지 | — | ✅ | test | 8081 |
| `main` PR | ✅ | — | — | — |
| `main` 머지 | — | ✅ | prod | 8080 |

---

## 파일 목록

| 파일 | 용도 |
|---|---|
| `.github/workflows/ci.yml` | PR 시 백엔드 테스트 실행 + PR 코멘트 |
| `.github/workflows/cd.yml` | 이미지 빌드·푸시 → OCI 배포 → 헬스체크 → 스모크 테스트 → 실패 시 롤백 |
| `infra/docker-compose.prod.yml` | OCI prod 스택 (port 8080, `prod-latest`) |
| `infra/docker-compose.test.yml` | OCI test 스택 (port 8081, `test-latest`) |

---

## OCI 초기 세팅 (한 번만)

1. nginx 설치 + 서브도메인별 conf 작성 + Let's Encrypt SSL
2. `OCI_DEPLOY_PATH` 디렉터리 생성
3. `docker-compose.prod.yml`, `docker-compose.test.yml` 업로드
4. `.env.prod`, `.env.test` 작성 (백엔드가 확정하는 환경변수)
5. `docker login ghcr.io` — GHCR pull 권한
6. OCI Security List: 포트 8080, 8081 오픈

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
BACKEND_TAG=prod-abc1234 docker compose -f docker-compose.prod.yml up -d
```

## 미결 사항
- DB 종류 미정 (백엔드 결정) → `.env.prod/.env.test` 완성 후 compose에 반영
- 스모크 테스트 엔드포인트 (백엔드 구현 후 `cd.yml`에 추가)
- nginx conf 도메인 (도메인 구매 후 작성)
- Spring Boot Actuator 의존성 (백엔드가 `build.gradle`에 추가해야 헬스체크 작동)
