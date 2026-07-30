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
- Email Delivery: **월 3,000통** — 이것도 홈 리전(`ap-tokyo-1`)에서 만든 Email Domain/DKIM/Approved Sender에만 적용. 다른 리전에서 만들면 과금 시작.

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
  docker compose (단일 파일: infra/docker-compose.yml, 2026-07-26 실측 = 5개 서비스)
    ├── nginx (80/443)       → HTTP→HTTPS 리다이렉트 + SSL 종단 (Let's Encrypt, 만료 2026-09-27)
    │     api.prod.likelion-khu.com  → backend-prod:8080
    │     api.stage.likelion-khu.com → backend-stage:8080
    ├── backend-stage        → STAGE_TAG 변수 (기본: stage-latest)  (host:8081 → container:8080)
    ├── backend-prod         → PROD_TAG 변수 (기본: prod-latest)    (host:8080 → container:8080)
    ├── sqlite-web-stage     → 조회 전용 GUI, 127.0.0.1:8090에만 바인딩 (공인 포트 아님)
    └── sqlite-web-prod      → 조회 전용 GUI, 127.0.0.1:8091에만 바인딩 (공인 포트 아님)
  ※ STAGE_TAG / PROD_TAG 분리 — stage 배포 시 STAGE_TAG만 세팅, prod는 건드리지 않음
  ※ sqlite-web-*는 dbtunnel 계정의 SSH 포트포워딩으로만 접근(db-access.md 참고) — nginx 안 거침, 공인 인터넷 노출 없음

크론(서버 실측, 2026-07-26 기준 — 2026-07-27 scripts/ 이동으로 경로만 갱신, 서버 crontab 반영은 별도 확인 필요):
  0 18 * * *   scripts/backup-db.sh              → prod·stage DB 스냅샷 업로드 + push-backup-metric.py 호출 (매일 1회)
  */5 * * * *  scripts/push-disk-metric.py       → 디스크 사용률 custom metric
  */5 * * * *  scripts/push-git-drift-metric.py  → git 워킹트리 드리프트 custom metric
  */5 * * * *  scripts/push-email-failure-metric.py prod/stage → email_log 최근 5분 실패건수 custom metric (#113, 두 줄 등록)
  */5 * * * *  scripts/push-email-success-metric.py prod/stage → email_log 최근 5분 성공건수 custom metric (#113 후속, 알람 없음·대시보드 시계열 전용, 두 줄 등록)
  ※ 전부 ~/oci-monitor-venv(격리 venv, oci SDK만) 안의 python3로 실행, 절대경로는 /home/ubuntu/website/infra/scripts/*

GHCR (이미지 레지스트리)
  backend:stage-{sha} / backend:stage-latest
  backend:prod-{sha} / backend:prod-latest

DNS (호스팅케이알, 네임서버 ns1~4.hosting.co.kr — 2026-07-26 dig 실측):
  likelion-khu.com               A     → Vercel(프론트) — MX 없음(수신 메일함 없음, 발신 전용 Email Delivery만)
  www.likelion-khu.com           CNAME → Vercel
  api.prod.likelion-khu.com      A     → 168.138.202.82 (이 OCI 인스턴스)
  api.stage.likelion-khu.com     A     → 168.138.202.82 (이 OCI 인스턴스)
  likelion-khu.com               TXT   → SPF(`email-delivery.md` 참고), 별도 `_dmarc` TXT도 등록됨
  ※ 프론트 스테이징 도메인은 `dev.likelion-khu.com`(고정 이름, `uptime-monitoring.md`에 이미 공개돼 있음) — Vercel이 서빙, 이 서버 nginx/인증서와 무관
  ※ CAA 레코드 없음(어떤 CA든 이 도메인 인증서 발급 가능) — 지금 위험도는 낮지만 강화하려면 CAA로 Let's Encrypt만 허용하는 걸 검토 가능

Vercel → 프론트엔드 (인프라 무관)
```

DNS 레코드가 실제로 어떤 요청 흐름을 담당하는지(계층별 설명)는 [`infra/docs/dns.md`](./docs/dns.md) 참고.

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
| `infra/nginx.conf` | nginx 설정 — 서버에만 존재 (gitignore). SSL + 도메인 라우팅 + `client_max_body_size 6m`(백엔드 멀티파트 한도 5MB보다 살짝 크게 — 백엔드가 자기 한도 초과 시 친절한 JSON 에러를 낼 수 있도록. 자세한 경위는 아래 참고) 설정 완료 |
| `infra/.env.stage.example` | stage 환경변수 템플릿 |
| `infra/.env.prod.example` | prod 환경변수 템플릿 |
| `infra/data/` | SQLite DB 파일 — 서버에만 존재 (gitignore), `mkdir -p data/`로 생성 |
| `infra/logs/{stage,prod}/` | 배포 태그별 애플리케이션 로그 파일 — 서버에만 존재 (gitignore), 재배포로 컨테이너가 교체돼도 유실 안 됨 |
| `infra/scripts/` | 실행되는 스크립트 전부(배포·백업·메트릭 push 등) — 2026-07-27 문서와 분리 |
| `infra/docs/` | 이 CLAUDE.md·AGENTS.md·SECURITY.md를 뺀 나머지 인프라 문서 전부 — 2026-07-27 스크립트와 분리(Claude Code가 디렉터리별로 자동 로드하는 CLAUDE.md/AGENTS.md만 `infra/` 루트에 남음) |
| [`infra/docs/logging.md`](./docs/logging.md) | 로그 파일 영속화·버전별 분리 구조 — 재배포해도 스택트레이스가 안 사라지게 한 경위 |
| [`infra/docs/RUNBOOK.md`](./docs/RUNBOOK.md) | 인프라 운영 러너북 — 알람별 대응 절차·자주 쓰는 명령(배포·롤백·DB복원). infra 바뀌면 같은 PR에서 이 문서도 갱신 |
| [`infra/docs/handoff.md`](./docs/handoff.md) | 이 역할의 마인드셋·지표·역량 체크리스트·평소 루틴·협업 인터페이스·인수인계 체크리스트·계정 인벤토리(`pm/docs/handoff.md`의 인프라 절 상세) |
| [`infra/docs/db-access.md`](./docs/db-access.md) | DB 접속 방법 · Flyway 기준 허용/금지 · 백업 전략 · GUI 뷰어(sqlite-web) 구성 |
| `infra/scripts/db-dev-ui.sh` | 개발자 로컬 실행용 — tmux로 sqlite-web 조회(브라우저)+dbclient 조작(CLI)을 한 창에 띄움 |
| [`infra/docs/uptime-monitoring.md`](./docs/uptime-monitoring.md) | 외부 가동 감시(UptimeRobot) — #83 ①②(외부 접속 불가·서버 전체 다운) |
| [`infra/docs/observability.md`](./docs/observability.md) | 리소스·백업 관측(OCI Monitoring/Alarms/Notifications) — #83 ③④(디스크·메모리 사전경고, 백업 확신) |
| [`infra/docs/dns.md`](./docs/dns.md) | DNS 레코드가 요청 흐름 계층별로(프론트/백엔드 라우팅/이메일/인증서) 왜 이렇게 세팅됐는지 |
| `infra/docs/iam.md` (레포에 없음, gitignore) | OCI IAM 구조(사용자·그룹·정책 최소권한 매핑) — 공개 레포에 권한 지도를 안 남기려고 로컬 전용. 콘솔 `Identity & Security`에서 실시간 확인 가능, 인수인계 시 장찬욱이 직접 전달. 새 IAM 계정 만드는 절차 자체는 `infra/docs/handoff.md` "계정 인벤토리"에 있음 |
| `infra/scripts/push-disk-metric.py` / `infra/scripts/push-backup-metric.py` / `infra/scripts/push-git-drift-metric.py` / `infra/scripts/push-email-failure-metric.py` / `infra/scripts/push-email-success-metric.py` | 서버가 instance principal로 custom metric을 직접 전송하는 스크립트 — 상세는 `docs/observability.md` |
| `.gitleaks.toml` / `.gitleaksignore` | 시크릿 스캔 규칙 · 확인 후 무시 처리한 기존 finding(fingerprint) 목록 |
| `.githooks/pre-commit` | 로컬 커밋 시점에 gitleaks로 시크릿 선차단(CI는 푸시 후에야 걸러짐). 최초 1회 `git config core.hooksPath .githooks` 필요 — 각자 로컬 설정이라 레포에 커밋해도 자동 적용 안 됨 |

---

## nginx 설정 — 실제 값 (2026-07-26 서버 실측)

`infra/nginx.conf`는 gitignore라 레포엔 없다 — 여기가 실제 구조를 확인할 수 있는 유일한 곳이니 nginx를 바꾸면 이 절도 같이 갱신할 것.

```
http {
  client_max_body_size 6m;   # 백엔드 멀티파트 한도(5MB)보다 살짝 크게 — 백엔드가 자기 한도 초과 시
                             # 친절한 JSON 에러를 낼 기회를 주기 위함(nginx가 먼저 뚝 끊지 않도록)

  server { listen 80; server_name api.prod.likelion-khu.com api.stage.likelion-khu.com;
           return 301 https://$host$request_uri; }   # 80은 리다이렉트만, 실제 라우팅 없음

  server { listen 443 ssl; server_name api.prod.likelion-khu.com;
           ssl_certificate/key: likelion-khu.com-0001 lineage
           location / { proxy_pass http://backend-prod:8080; ... X-Forwarded-* 헤더 } }

  server { listen 443 ssl; server_name api.stage.likelion-khu.com;
           ssl_certificate/key: likelion-khu.com-0001 lineage (위와 동일 인증서, SAN에 둘 다 포함)
           location / { proxy_pass http://backend-stage:8080; ... X-Forwarded-* 헤더 } }
}
```

**인증서는 `likelion-khu.com-0001` lineage 하나만 있다** (`Domains: likelion-khu.com api.prod.likelion-khu.com api.stage.likelion-khu.com`). 한때 `likelion-khu.com`이라는 이름의 두 번째 lineage가 더 있었는데(프론트 스테이징 서브도메인 포함, 용도 불분명), 이 nginx.conf 어디서도 참조되지 않는 걸 확인하고 2026-07-26 `sudo certbot delete --cert-name likelion-khu.com`로 정리했다 — 삭제 후 prod·stage 헬스체크 정상 확인.

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
- **자동 보안 업데이트**: `unattended-upgrades` 기본 활성화 — 보안 패치만 자동 적용, 전체 업그레이드는 수동
- **SSL 인증서**: `/etc/letsencrypt/live/likelion-khu.com/` — certbot이 자동 갱신 등록함 (만료 2026-09-27)

> OCID 등 민감 정보는 `~/.oci/config` 또는 OCI 콘솔에서 확인

---

OCI IAM 구조(사용자·그룹·정책 매핑)는 `infra/docs/iam.md`(로컬 전용, 레포엔 없음 — 위 파일 목록 참고)에 있다. 새 담당자용 IAM 계정 만드는 절차는 `infra/docs/handoff.md` "계정 인벤토리" 참고.

---

## OCI 초기 세팅 (한 번만)

1. `OCI_DEPLOY_PATH` 디렉터리 생성 + git clone
2. `infra/nginx.conf` 작성 ✅ 완료 — SSL + 도메인 라우팅 설정됨
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

## 수동 배포·롤백

명령어·절차는 [`RUNBOOK.md`](./docs/RUNBOOK.md#cheat-sheet)에 단일화 — 여기 다시 안 적는다(두 곳에 있으면 하나만 고치고 잊는 사고가 난다).

**이 롤백은 앱 이미지만 되돌린다 — DB 파일은 그대로다(2026-07-27, V6 사고 후속).** Flyway가 이미 실행·커밋한 마이그레이션(테이블 변경·행 삭제 등)은 이미지가 옛날로 돌아가도 DB엔 남는다. 실제로 V6 사고에서는 마이그레이션 자체가 예외로 실패해 그 스크립트 전체가 SQLite 트랜잭션으로 롤백됐고(DB는 그대로 V5 상태) 앱만 기동을 못 한 케이스라 이미지 롤백만으로 충분했지만, **마이그레이션이 성공적으로 커밋된 뒤 전혀 무관한 이유(앱 버그 등)로 헬스체크가 실패하는 경우엔 다르다** — 그땐 DB가 이미 새 스키마(행 삭제 포함)로 넘어간 채 앱만 구버전으로 돌아가는 애매한 상태가 된다.

**DB 파일도 롤백과 함께 자동 복원하는 건 의도적으로 안 한다.** 그 자동화를 걸어두면, 마이그레이션이 문제없이 커밋된 뒤 실사용자가 새로 쓴 데이터(신규 가입·글 등)가 있어도 헬스체크 실패 시점에 무조건 배포 이전 스냅샷으로 덮어써서 그 진짜 데이터까지 날려버린다 — "이 실패가 마이그레이션 때문인지, 완전히 무관한 문제인지"는 스크립트가 구분 못 하는 판단이라, DB 복원은 항상 사람이 상황을 보고 결정해서 수동으로 한다. 대신 행을 삭제하는 마이그레이션을 배포하기 *전에* 신선한 복구 지점을 만들어두는 수동 백업 절차는 [`db-access.md`](./db-access.md)의 "백업 전략" 절 하위 항목 참고.

## 미결 사항

살아있는 "지금 안 끝난 것"만 한 줄씩 — 상세·경위는 각 문서가 갖고 있다(여기 복붙 안 함). 완료된 항목은 지운다(히스토리는 `pm/docs/learnings.md`·git log가 가짐).

> 2026-07-26 서버 SSH 실측 재확인: 신선우 공개키 등록·sqlite-web GUI 뷰어(`main` 승격 포함)·이메일 자격증명 전달(#75 closed)·#83 PR 제출(머지·이슈 closed) — **전부 완료 확인.** 이전 버전의 이 섹션에 "미결"로 남아있던 항목들이 실제로는 이미 끝나 있었음(문서 갱신 누락).

- **서버 `dev`가 `origin/dev`와 커밋 단위로 갈라져 있음(2026-07-26 실측: 로컬 전용 26개, origin 전용 16개)** — 서버 배포 키가 read-only라 `git pull`이 만드는 병합 커밋을 다시 push 못 해 반복 누적된 것으로 보임. 지금까지 실제 파일 내용(`docker-compose.yml` 등)엔 drift 없음을 확인했으나, 다음 `git pull`이 진짜 충돌을 낼 위험 있음 — 정리 방법(어느 쪽을 기준으로 reconcile할지)은 장찬욱 결정 필요. 대응 시 주의사항은 [`RUNBOOK.md`](./docs/RUNBOOK.md#cheat-sheet) "자주 쓰는 명령" 절 참고.
- **`infra/scripts/cleanup-old-logs.sh`(2026-07-26 추가) — 이 PR이 `dev`에 머지된 뒤 서버에서 크론 등록 필요.** 미머지 브랜치 상태로 서버에 먼저 올리면 git 드리프트 알람만 오탐 유발(`docs/observability.md` 참고)하므로 일부러 안 함. 머지 후: `crontab -e`에 `0 19 * * * /home/ubuntu/website/infra/scripts/cleanup-old-logs.sh >> /home/ubuntu/cleanup-logs.log 2>&1` 한 줄 추가(백업 cron 1시간 뒤 시간대), `git ls-tree HEAD -- infra/scripts/cleanup-old-logs.sh`로 `100755` 확인.
- **`infra/scripts/push-email-success-metric.py`(#113 후속 추가) — 이 PR이 `dev`에 머지된 뒤 서버에서 크론 등록 필요.** 같은 이유로 미머지 상태론 서버에 안 올림. 머지 후: `crontab -e`에 `*/5 * * * * /home/ubuntu/oci-monitor-venv/bin/python3 /home/ubuntu/website/infra/scripts/push-email-success-metric.py prod` + `stage` 두 줄 추가(`push-email-failure-metric.py`와 동일 venv·동일 등록 방식), `git ls-tree HEAD -- infra/scripts/push-email-success-metric.py`로 `100755` 확인.
