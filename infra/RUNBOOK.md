# 인프라 런북 (Runbook)

> 인수인계용. 인스턴스 사양·연결·파일 구조·CI/CD 흐름을 있는 그대로 기록한다.
> 추상적 설명 없이 주어+동사+목적어로 쓴다.

---

## 1. OCI 인스턴스 사양

| 항목 | 값 |
|---|---|
| 클라우드 | Oracle Cloud Infrastructure (Always Free) |
| 리전 | ap-tokyo-1 (도쿄) |
| Shape | VM.Standard.A1.Flex (Ampere A1, **arm64/v8**) |
| OCPU | 2 |
| 메모리 | 12 GB |
| 디스크 | 48 GB (부트볼륨) |
| OS | Ubuntu 24.04.4 LTS |
| CPU 모델 | Neoverse-N1 |
| Docker | 29.1.3 |
| 공인 IP | `168.138.202.82` (고정) |

> **주의**: arm64 아키텍처다. Docker 이미지는 반드시 `linux/arm64`로 빌드해야 한다. amd64 이미지를 배포하면 `exec format error`로 컨테이너가 즉시 종료된다.

---

## 2. 연결 정보

### SSH 접속

```bash
ssh likelion-oci          # ~/.ssh/config 단축키 등록됨 (장찬욱 로컬)
# 또는 직접:
ssh -i ~/.ssh/oci_server.pem ubuntu@168.138.202.82
```

| 항목 | 값 |
|---|---|
| 사용자 | `ubuntu` |
| SSH 키 파일 | `~/.ssh/oci_server.pem` (장찬욱 로컬) |
| 배포 경로 | `/home/ubuntu/website/infra/` |
| 레포 루트 | `/home/ubuntu/website/` |

### OCI CLI (장찬욱 로컬)

| 항목 | 값 |
|---|---|
| 설정 파일 | `~/.oci/config` |
| API 키 파일 | `~/.ssh/oci_api_key.pem` (백업) / `~/.oci/oci_api_key.pem` (원본) |
| Tenancy | `ap-tokyo-1` 홈 리전 |

---

## 3. GitHub Secrets (레포 등록)

GitHub Actions CD가 서버에 접속·배포할 때 사용한다.

| Secret 이름 | 값 | 용도 |
|---|---|---|
| `OCI_HOST` | `168.138.202.82` | SSH 접속 대상 IP |
| `OCI_USER` | `ubuntu` | SSH 로그인 사용자 |
| `OCI_SSH_KEY` | OpenSSH 프라이빗 키 전문 | `appleboy/ssh-action`이 서버에 명령 실행 시 사용 |
| `OCI_DEPLOY_PATH` | `/home/ubuntu/website/infra` | CD 스크립트가 `cd`할 경로 |

---

## 4. infra/ 디렉터리 파일 목록

```
infra/
├── docker-compose.yml      ← 레포에 있음
├── .env.stage.example      ← 레포에 있음 (템플릿)
├── .env.prod.example       ← 레포에 있음 (템플릿)
├── CLAUDE.md               ← 레포에 있음 (AI 협업 하네스)
├── RUNBOOK.md              ← 레포에 있음 (이 파일)
├── nginx.conf              ← 서버에만 존재 (.gitignore)
├── .env.stage              ← 서버에만 존재 (.gitignore)
├── .env.prod               ← 서버에만 존재 (.gitignore)
└── data/                   ← 서버에만 존재 (.gitignore)
    ├── stage.db            ← stage SQLite DB 파일
    └── prod.db             ← prod SQLite DB 파일
```

### 각 파일 역할

**`docker-compose.yml`**
- nginx, backend-stage, backend-prod 세 컨테이너를 정의한다.
- `backend-stage`는 포트 8081을 호스트에 노출하고, `backend-prod`는 포트 8080을 호스트에 노출한다.
- `backend-stage`는 `${BACKEND_TAG:-stage-latest}` 이미지를 사용한다. CD가 `BACKEND_TAG` 환경변수로 배포할 태그를 주입한다.
- `./data` 디렉터리를 컨테이너 `/app/data`에 바인드 마운트한다. SQLite DB 파일이 여기에 저장된다.

**`.env.stage` / `.env.prod`** (서버에만 존재)
- Spring Boot가 구동될 때 읽는 환경변수 파일이다.
- `SPRING_PROFILES_ACTIVE`, `JWT_SECRET`, `DB_PATH`를 포함한다.
- stage는 `DB_PATH=/app/data/stage.db`, prod는 `DB_PATH=/app/data/prod.db`로 설정되어 있다.
- 새 서버에 세팅할 때는 `.env.stage.example` / `.env.prod.example`을 복사하고 값을 채운다.

**`.env.stage.example` / `.env.prod.example`**
- 레포에 커밋된 환경변수 템플릿이다. 실제 값은 비어있다.
- 신규 서버 세팅 시 참고용으로 사용한다.

**`nginx.conf`** (서버에만 존재)
- nginx 컨테이너의 설정 파일이다.
- 현재 도메인 미확정으로 작성 대기 중이다. 도메인 확정 후 Let's Encrypt SSL 포함하여 작성한다.

**`data/`** (서버에만 존재)
- SQLite DB 파일 디렉터리다.
- 컨테이너가 `/app/data/stage.db` 또는 `/app/data/prod.db`를 처음 열 때 SQLite가 해당 파일을 자동으로 생성한다.
- 컨테이너를 삭제해도 이 디렉터리는 호스트에 남아 데이터가 보존된다.
- 백업이 없으면 서버가 날아갈 때 데이터도 같이 사라진다. 주기적 백업을 권장한다.

---

## 5. CI 흐름

**트리거 조건**: `dev` 또는 `main`을 대상으로 PR이 열릴 때, 변경 경로가 `backend/**`, `shared/**`, `frontend/**` 중 하나라도 포함되면 CI가 실행된다.

**실행 순서**:

1. GitHub Actions runner(ubuntu-latest)가 소스코드를 체크아웃한다.
2. runner가 JDK 21을 설치한다.
3. runner가 Gradle 빌드 환경을 세팅한다.
4. runner가 백엔드 빌드와 테스트를 실행한다. (**현재 임시 통과 상태** — 실제 테스트 코드 작성 후 `ci.yml`의 주석 처리된 블록을 활성화해야 한다.)
5. runner가 PR에 성공/실패 결과를 코멘트로 남긴다.

---

## 6. CD 흐름

**트리거 조건 (자동)**: `dev` 또는 `main`에 push(머지)될 때, 변경 경로가 `backend/**` 또는 `shared/**`를 포함하면 CD가 실행된다.

**트리거 조건 (수동)**: GitHub Actions 탭에서 `workflow_dispatch`로 환경(`stage` / `prod`)을 선택해 수동 실행할 수 있다.

**환경 결정 로직**:
- `main` 브랜치에 push → prod 환경 (`backend-prod`, 포트 8080)
- `dev` 브랜치에 push → stage 환경 (`backend-stage`, 포트 8081)
- `workflow_dispatch` 수동 실행 → 입력값 우선

**실행 순서**:

1. GitHub Actions runner가 소스코드를 체크아웃한다.
2. runner가 `ghcr.io`(GitHub Container Registry)에 로그인한다.
3. runner가 QEMU를 설치한다. (x86_64 runner에서 arm64 이미지를 빌드하기 위한 에뮬레이터)
4. runner가 Docker Buildx를 설치한다. (멀티 플랫폼 빌드 드라이버)
5. runner가 `backend/Dockerfile`을 빌드하여 `linux/arm64` 이미지를 만든다. GHA 캐시를 사용해 레이어를 재사용한다.
6. runner가 빌드된 이미지를 두 개의 태그로 GHCR에 푸시한다.
   - `ghcr.io/likelion-khu-official/website/backend:{env}-{sha}` (고정 버전)
   - `ghcr.io/likelion-khu-official/website/backend:{env}-latest` (최신 포인터)
7. runner가 SSH로 OCI 서버에 접속한다.
8. 서버가 GHCR에 로그인한다. (private 이미지 pull 권한 획득)
9. 서버가 `/home/ubuntu/website`로 이동한 뒤 `git pull origin {브랜치}`를 실행하여 최신 코드(compose 파일 포함)를 내려받는다.
10. 서버가 현재 실행 중인 컨테이너의 이미지 태그를 `.prev_backend_tag_{env}` 파일에 저장한다. (롤백용)
11. 서버가 `BACKEND_TAG={sha태그}`를 환경변수로 설정하고 `docker compose pull {서비스}`를 실행하여 새 이미지를 내려받는다.
12. 서버가 `docker compose up -d {서비스}`를 실행하여 새 이미지로 컨테이너를 재시작한다.
13. 서버가 `curl http://localhost:{포트}/actuator/health`를 3초 간격으로 반복 호출한다. 120초 안에 HTTP 200이 오면 헬스체크 통과, 초과하면 실패로 처리한다.
14. runner가 외부에서 `http://{OCI_HOST}:{포트}/api/...` 엔드포인트를 호출하는 스모크 테스트를 실행한다. (**현재 엔드포인트 미구현으로 항목 없음** — API 구현 후 `cd.yml`에 추가한다.)
15. 헬스체크 또는 스모크 테스트가 실패하면 롤백 단계가 실행된다. 서버가 10번에서 저장한 이전 태그로 `docker compose up -d`를 다시 실행한다.

---

## 7. 수동 운영 명령

```bash
# 서버 접속
ssh likelion-oci

# 컨테이너 상태 확인
docker compose -f /home/ubuntu/website/infra/docker-compose.yml ps

# 로그 확인
docker compose -f /home/ubuntu/website/infra/docker-compose.yml logs backend-stage -f
docker compose -f /home/ubuntu/website/infra/docker-compose.yml logs backend-prod -f

# 수동 롤백 (stage)
cd /home/ubuntu/website/infra
BACKEND_TAG=stage-{되돌릴sha} docker compose up -d backend-stage

# 수동 롤백 (prod)
cd /home/ubuntu/website/infra
BACKEND_TAG=prod-{되돌릴sha} docker compose up -d backend-prod

# DB 파일 위치
ls -lh /home/ubuntu/website/infra/data/
```

---

## 8. 신규 서버 세팅 체크리스트

처음부터 서버를 새로 구성해야 할 때 순서대로 실행한다.

- [ ] `git clone https://github.com/likelion-khu-official/website.git /home/ubuntu/website`
- [ ] `mkdir -p /home/ubuntu/website/infra/data`
- [ ] `.env.stage.example`을 복사해 `.env.stage` 작성 (`JWT_SECRET` 등 실제 값 입력)
- [ ] `.env.prod.example`을 복사해 `.env.prod` 작성
- [ ] `nginx.conf` 작성 (도메인 확정 후, Let's Encrypt SSL 포함)
- [ ] `echo "$GHCR_TOKEN" | docker login ghcr.io -u {username} --password-stdin` (이미지 pull 권한)
- [ ] OCI 보안 리스트에서 인바운드 포트 오픈: 22, 80, 443, 8080, 8081
- [ ] GitHub Secrets 4개 등록: `OCI_HOST`, `OCI_USER`, `OCI_SSH_KEY`, `OCI_DEPLOY_PATH`
