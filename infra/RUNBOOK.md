# 인프라 운영 러너북 — 담당자가 할 수 있어야 하는 것 · 알람 대응 · 협업 인터페이스

> 오너: 장찬욱(@cjang3285). **살아있는 문서** — infra를 바꾸면 같은 PR에서 이 문서도 같이 갱신한다(아래 "갱신 규칙" 참고).

## 이 문서가 왜 필요한가

`pm/docs/handoff.md`(다음 기수로 넘기는 방법)에서 김우진이 물었던 질문 — "가끔 알림이 오는데, 받으면 뭘 해야 하는지 정해져 있어?" — 에 그 문서는 "정해져 있지 않다, 이게 실제 공백"이라고 답하고 이 러너북을 다음 할 일로 남겼다. 이 문서가 그 공백을 메운다.

이 문서는 세 가지를 묶는다:
1. **역량** — 인프라 담당자(나 자신, 또는 다음 담당자)가 최소한 할 수 있어야 하는 것.
2. **대응 절차(runbook)** — 알람이 울렸을 때 "이게 왜 왔고, 뭘 확인하고, 뭘 해야 하는지".
3. **협업 인터페이스** — 백엔드·프론트가 인프라와 맞물리는 지점에서 서로 뭘 지켜야 하는지.

세부 구현 경위(왜 이렇게 만들었는지)는 각 주제별 문서(`observability.md`·`uptime-monitoring.md`·`db-access.md`·`logging.md`)에 이미 있다 — 여기서는 그걸 복붙하지 않고 "지금 이 순간 뭘 해야 하는가"만 담는다. 상세가 필요하면 링크를 따라간다.

---

## 0. 먼저 읽을 지도

| 문서 | 뭘 담고 있나 |
|---|---|
| [`infra/CLAUDE.md`](./CLAUDE.md) | 아키텍처 한눈에, 브랜치↔환경 대응, 파일 목록, OCI 무료 티어 한도표 |
| `pm/docs/handoff.md` | 인수인계 전체 그림 — 뭐가 이미 자동화됐고, 뭐가 아직 개인(장찬욱)에게 묶여 있는지 |
| [`observability.md`](./observability.md) | 디스크·메모리·백업 알람의 설계 경위·튜닝 사고모델 |
| [`uptime-monitoring.md`](./uptime-monitoring.md) | UptimeRobot 설계 경위·한계(5분 체크 틈새) |
| [`db-access.md`](./db-access.md) | DB 접속·Flyway 경계·백업 전략 |
| [`logging.md`](./logging.md) | 로그 영속화 구조 |
| `pm/docs/learnings.md` "인프라 · CI/CD" 절 | 실제 사고 히스토리 — 같은 함정을 반복하지 않기 위한 원본 |

---

## 1. 인프라 담당자가 할 수 있어야 하는 것

아래를 못 하면 이 역할을 넘겨받았다고 보기 어렵다 — 인수인계 체크리스트로도 쓴다.

| 역량 | 확인 방법 |
|---|---|
| 서버 SSH 접속 | `ssh likelion-oci` (로컬 `~/.ssh/config` 등록 + `~/.ssh/oci_server.pem` 필요) |
| docker compose 스택 상태 파악 | `docker compose -f ~/website/infra/docker-compose.yml ps`, `... logs --tail=100 <service>` (`-f` 경로 빠뜨리면 기본 디렉터리에서 compose 파일을 못 찾음 — 2026-07-26 PM 리뷰로 발견) |
| 수동 배포·롤백 | 아래 3절 "자주 쓰는 명령" — **태그를 반드시 명시**해야 한다(미지정 시 위험, learnings 참고) |
| DB 접근 계정 발급 | `infra/.claude/skills/db-access/` 스킬 또는 `db-access.md` "온보딩" 절 — 공개키 등록은 서버에서 사람이 직접(자동화 안 함, 의도적) |
| OCI 콘솔·CLI 조작 | 콘솔: `Observability & Management → Monitoring`(컴파트먼트 루트, 리전 `ap-tokyo-1`). CLI: `~/.oci/config` 자격증명, JSON 인자 있는 명령은 **Bash로**(PowerShell 인코딩 문제) |
| 비용 한도 점검 | `infra/CLAUDE.md`의 Always Free 표와 실사용량 대조 — 알림이 없는 항목이라 사람이 주기적으로 봐야 함(2절 "루틴 점검" 참고) |
| SSL 인증서 상태 확인 | `sudo certbot certificates` 또는 `/etc/letsencrypt/live/likelion-khu.com/` 만료일 확인 (certbot이 자동 갱신하지만 실패 시 알림이 없음) |
| GitHub Secrets 확인·회전 | `OCI_HOST`·`OCI_USER`·`OCI_SSH_KEY`·`OCI_DEPLOY_PATH` — 레포 Settings → Secrets |
| gitleaks pre-commit 훅 | 로컬에 `git config core.hooksPath .githooks` 최초 1회 설정 필요(레포 커밋만으론 자동 적용 안 됨) |

---

## 2. 알람 대응 절차 (Runbook)

원칙: **알람은 항상 "왜 울렸는지"가 메일 본문에 있다**(4개 OCI 알람 전부 `ONS_OPTIMIZED` 포맷, UptimeRobot은 어떤 URL이 다운인지 명시). 아래는 **처음 보는 사람도 그대로 복사해 자기 로컬 터미널에 붙여넣으면 되도록** 항목마다 한 블록으로 묶었다 — 셋업(SSH config·키)만 1절 대로 돼 있으면 된다.

> 아래 모든 명령은 2026-07-26에 실제 서버(`ssh likelion-oci`)에 접속해 하나씩 직접 실행하고 결과를 확인한 것이다(디스크 정리·메모리 재기동·백업 재실행 포함, 실제로 실행해 성공을 확인했다) — 이론상 맞는 명령이 아니라 실측된 명령이다. 다음에 이 문서를 고칠 땐 이 원칙을 유지할 것: **명령을 추가·수정하면 실제로 한 번 돌려보고 결과를 확인한 뒤에 커밋한다.**

### 2-1. OCI Monitoring — 디스크 사용률 80% 초과 (CRITICAL)

**의미**: `/` 사용률이 5분 이상 80% 초과. 한도는 부트+블록 합계 200GB(무료 티어 경계) — 임계치(80%)는 그보다 훨씬 낮아 아직 여유 있는 조기 경보.

```bash
ssh likelion-oci 'df -h / && echo --- && docker system df && echo --- && du -sh /home/ubuntu/website/infra/logs/* /home/ubuntu/backups 2>/dev/null'

ssh likelion-oci 'docker image prune -f'
# ↑ 태그 없는(dangling) 이미지만 지운다 — 절대 -a를 쓰지 말 것. -a는 실행 중이지 않은
#   모든 이미지를 지우는데, 여기엔 "수동 롤백"(3절)에 필요한 이전 버전 태그 이미지도
#   포함된다. 이 실수를 실제로 할 뻔했다가 시스템이 막아서 알게 됨(2026-07-26).

ssh likelion-oci 'df -h /'   # 정리 후 재확인
```

**다음**: `infra/logs/{stage,prod}/`의 30일 넘은 로그는 `cleanup-old-logs.sh`가 매일 자동으로 지운다(2026-07-26 추가) — 그런데도 안 줄면 원인이 로그가 아니라 다른 것(도커 이미지·볼륨 등)이라는 뜻이니 위 `docker system df` 결과부터 다시 볼 것. 며칠 내 재발하거나 200GB에 근접하는 추세면 김우진 공유 — 블록 볼륨 확장은 무료 한도(200GB) 안인지 먼저 확인.

### 2-2. OCI Monitoring — 메모리 사용률 85% 초과 (CRITICAL)

**의미**: 5분 이상 메모리 85% 초과. 인스턴스는 2 OCPU/12GB 고정(무료 티어 경계), 스왑 없음.

```bash
ssh likelion-oci 'free -m && echo --- && docker stats --no-stream'

ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml restart backend-stage'
# ↑ 위 docker stats에서 메모리를 크게 물고 있던 서비스로 바꿔서 실행 (backend-prod 등)

sleep 30   # Spring Boot 기동에 20~30초 걸린다 — 재기동 직후 바로 확인하면 000(연결 실패)이 뜬다(실측 확인)
ssh likelion-oci 'curl -s -o /dev/null -w "재기동 후:%{http_code}\n" http://localhost:8081/actuator/health && free -m'
```

**다음**: 반복 재발이면 근본 원인(메모리 누수) 의심 — 신선우·안시현에게 공유(4절 참고). 인스턴스 재부팅은 최후 수단(재부팅 자체는 안전하다고 실측 확인됐지만 진단 정보를 날림). 스케일업(4 OCPU/24GB)은 **무료 티어 이탈**이라 김우진 결정 필요.

### 2-3. OCI Monitoring — DB 백업 26시간 이상 부재 (prod/stage, CRITICAL)

**의미**: dead man's switch — 원인 불문하고 "마지막 성공 신호로부터 26시간 경과"만 본다. 값이 나쁜 게 아니라 신호 자체가 없다는 뜻.

```bash
ssh likelion-oci 'tail -20 ~/backup.log && echo --- && crontab -l | grep backup-db && echo --- && git -C ~/website ls-tree HEAD -- infra/backup-db.sh'
# ↑ 마지막 줄이 100755가 아니면(예: 100644) 실행권한이 벗겨진 것 — 아래 "다음" 참고

ssh likelion-oci 'cd ~/website/infra && bash backup-db.sh && echo --- && tail -5 ~/backup.log'
# ↑ 수동 1회 실행 — prod·stage 업로드 + 메트릭 전송까지 성공하면 다음 평가 주기에 알람이 OK로 전환된다
```

**다음**: 위 `git ls-tree`가 `100644`(비실행)였다면 — 서버에 수동 `chmod +x`만 걸려 있고 git엔 반영이 안 된 상태다. `git -C ~/website update-index --chmod=+x infra/backup-db.sh` 후 커밋하고 **dev·main 양쪽에 다** 머지할 것(한쪽만 하면 다른 쪽 배포가 다시 덮어씀). 흔한 다른 원인: CRLF로 셔뱅이 깨짐(`.gitattributes`로 이미 방지 중이나 재확인). 이 두 가지가 아니면(버킷 권한 만료 등) 근본 수정 PR 필요 — 급한 대로 수동 백업을 하루 더 반복하며 원인 조사.

### 2-4. OCI Monitoring — 배포서버 git 드리프트 감지 (CRITICAL)

**의미**: 서버 워킹트리에 untracked 변경 발생 — 사람이 SSH로 직접 고쳤거나, 새 볼륨을 gitignore 안 했거나, 미머지 브랜치를 서버에서 먼저 검증했을 때.

```bash
ssh likelion-oci 'git -C ~/website status --porcelain'
```

**다음**: 나온 파일이 **의도된 서버 전용 파일**(새 로그·데이터 디렉터리 등)이면 → 로컬에서 `.gitignore`에 추가하고 커밋·푸시(근본 수정, 알람 자체가 없어짐). **의도치 않은 수동 수정**이면 → 필요한 변경인지 판단 후 커밋하거나 `ssh likelion-oci 'git -C ~/website checkout -- <path>'`로 되돌림. **다음 배포 전 반드시 정리할 것** — 안 하면 배포가 실패하거나 드리프트를 덮어써서 방금 판단이 무의미해진다. (이 알람은 미커밋 변경만 본다 — 이미 커밋된 채로 origin과 갈라진 것은 못 잡는다는 사각지대가 있음, `observability.md` 참고.)

### 2-5. UptimeRobot — DOWN (api.prod / api.stage / likelion-khu.com / dev.likelion-khu.com)

**의미**: 외부에서 사이트·API 접속 불가. SSH 없이도 1차 확인 가능:

```bash
curl -s -o /dev/null -w 'prod:%{http_code}\n'  https://api.prod.likelion-khu.com/actuator/health
curl -s -o /dev/null -w 'stage:%{http_code}\n' https://api.stage.likelion-khu.com/actuator/health
curl -s -o /dev/null -w 'front-prod:%{http_code}\n' https://likelion-khu.com
curl -s -o /dev/null -w 'front-dev:%{http_code}\n'  https://dev.likelion-khu.com
```

**판단**: **prod+stage 백엔드 동시** DOWN → 인스턴스 전체 문제 가능성 큼(같은 OCI 인스턴스). **하나만** DOWN → 그 서비스 개별 문제. **프론트 두 개만** DOWN → Vercel 쪽, 인프라(OCI) 무관(4절 참고).

백엔드가 DOWN이면 서버로 들어가 원인 확인:

```bash
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml ps'
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml logs --tail=100 backend-prod'
# ↑ 대상 서비스로 바꿔서(backend-stage 등). ssh 자체가 안 되면 인스턴스 문제 — OCI 콘솔에서 인스턴스 상태부터 확인
```

**다음**: 크래시 루프면 로그에서 원인 확인 후 재기동(2-2절 재기동 명령 재사용). 최근 배포가 원인으로 의심되면 3절 "수동 롤백" 참고. **5분 체크 틈새 주의**: UptimeRobot은 무료 플랜 5분 주기라 5분 미만으로 끝나는 장애(재부팅 등)는 알림이 안 올 수 있다(`uptime-monitoring.md` 실측 참고) — "알림이 안 왔으니 괜찮았다"고 넘겨짚지 말 것.

### 2-6. (알람은 아니지만) 비용 한도 — 루틴 점검 필요

OCI 무료 티어 초과는 **알림이 없다**(예산 알림은 체험 크레딧 소진 전엔 안 울릴 수 있음, `infra/CLAUDE.md` 참고). 월 1회 정도 `infra/CLAUDE.md`의 한도표와 실사용량(컴퓨트 OCPU/메모리, 스토리지, Email Delivery 월 3,000통)을 수동 대조하는 걸 루틴으로 잡는다.

---

## 3. 자주 쓰는 명령 (Cheat sheet)

여기도 전부 복사해서 그대로 실행하는 걸 전제로 쓴다. `<브랜치>`·`<커밋SHA>`·`<서비스>`만 상황에 맞게 채운다.

**수동 배포/재기동 — 태그 반드시 명시** (미지정 시 로컬 캐시된 옛 이미지 또는 아키텍처 안 맞는 `latest`로 떨어질 수 있음, learnings 참고. 아래는 현재 배포된 태그로 실제 실행해 "이미 최신"이라 컨테이너가 재생성되지 않는 것까지 확인한 명령 형태):

```bash
ssh likelion-oci 'cd ~/website/infra && STAGE_TAG=stage-<커밋SHA> docker compose -f docker-compose.yml up -d backend-stage'
ssh likelion-oci 'cd ~/website/infra && PROD_TAG=prod-<커밋SHA>   docker compose -f docker-compose.yml up -d backend-prod'
```

**수동 롤백** — CD가 실패하면 자동 롤백되지만, 그걸로 안 되면 위 명령에 이전 정상 태그를 넣어 그대로 재실행.

**`infra/**` 단독 변경 후 배포**: CD의 paths 필터가 `backend/**`·`shared/**`만 감시해서 `docker-compose.yml` 등을 고친 push는 자동 배포가 안 된다 — 서버에서 수동으로, **CD(`cd.yml`)와 똑같은 방식으로 대상 브랜치를 명시적으로 전환**한다:

```bash
ssh likelion-oci 'cd ~/website && git fetch origin && git checkout -f <브랜치> && git pull origin <브랜치>'
ssh likelion-oci 'cd ~/website/infra && docker compose up -d <바뀐 서비스>'
```

`git pull origin <브랜치>`만 실행하면 브랜치 전환 없이 **현재 체크아웃된 브랜치에 그대로 병합**된다 — 예를 들어 현재 `main`이 체크아웃된 상태에서 `dev`용 변경을 배포하려고 이 명령만 실행하면 `dev`가 `main`에 섞인다. 반드시 `git checkout -f <브랜치>`로 먼저 전환할 것(2026-07-26 PM 리뷰로 발견·수정).

**주의 — 서버의 `dev`가 `origin/dev`와 커밋 단위로 갈라져 있을 수 있다(2026-07-26 실측: 로컬 전용 26개, origin 전용 16개).** 서버 배포 키가 GitHub에 read-only라 `git pull`이 만드는 병합 커밋을 다시 push 못 해서 반복 누적된 것(`pm/docs/learnings.md` 참고). 실제로 dry-run 병합(`git merge --no-commit --no-ff origin/dev` 후 `git merge --abort`)까지 해봐서 **지금 이 조합은 충돌 없이 깨끗하게 합쳐진다는 것까지 확인**했다 — 당장 급한 문제는 아니다. 다만 서버가 push를 못 하는 구조가 그대로면 이 카운트는 배포할 때마다 계속 늘어난다. 혹시 다음에 진짜 충돌 메시지가 뜨면 절대 임의로 `-X ours`/`-X theirs` 등으로 밀어붙이지 말고 먼저 장찬욱에게 확인.

**DB 접근 계정 발급**: `infra/.claude/skills/db-access/` 스킬 호출 또는 `db-access.md` "온보딩" 절 그대로 — 공개키를 받아 서버에서 직접 등록(자동화하지 않은 이유는 그 문서에 있음).

---

## 4. 백엔드·프론트와의 협업 인터페이스

인프라 CLAUDE.md에 있듯, 배포·인프라 조율은 PM을 거치지 않고 팀끼리 직접 한다. 아래는 그 직접 조율에서 서로 뭘 지켜야 하는지 — 새로 합류한 사람이 "왜 이걸 나한테 미리 알려줘야 하지"를 겪지 않도록 인터페이스를 명시한다.

### 4-1. 백엔드가 알아야/지켜야 하는 것

| 항목 | 내용 |
|---|---|
| **배포가 언제 도는가** | `backend/**`·`shared/**` 변경이 있는 PR이 `dev`/`main`에 머지될 때만 CD가 자동으로 돈다. `infra/**`만 바뀐 커밋은 안 돈다(위 3절). |
| **헬스체크 엔드포인트** | `/actuator/health`가 CD 헬스체크·UptimeRobot·스모크 테스트 판단 기준이다. 이 엔드포인트의 응답 계약(200/UP, 이상 시 503/DOWN)을 바꾸면 세 군데가 동시에 영향받는다 — 바꾸기 전에 인프라와 미리 공유. |
| **스모크 테스트 대상** | CD가 배포 직후 `/api/members`·`/api/staff`·`/api/posts`·`/api/projects`(인증 없이 공개된 조회 엔드포인트만)를 실제 도메인으로 찌른다. 새로운 공개 조회 엔드포인트를 추가하고 그게 배포 검증에 포함되길 원하면 `cd.yml`에 추가 요청. |
| **스키마 변경** | Flyway 마이그레이션(`backend/src/main/resources/db/migration/V{n}__*.sql`)으로만. sqlite3 직접 `ALTER`/`CREATE`/`DROP`은 `dbclient` 계정에서 기술적으로 차단돼 있다(`db-access.md`). |
| **새 환경변수** | `.env.stage`/`.env.prod`에 실제 값을 넣는 건 인프라(서버 접근 필요) — 새 환경변수가 필요하면 이름·용도를 인프라에 알려야 서버에 반영된다. 템플릿은 `infra/.env.{stage,prod}.example`. |
| **로그** | 컨테이너 기본 로그는 재배포 시 사라진다 — 파일 로그(`logging.file.name`)로 남게 이미 구성돼 있고 배포 태그별로 분리 저장된다(`infra/logs/{stage,prod}/`, `logging.md`). |
| **DB 직접 조회** | `dbclient` 계정으로 SSH 접속(`db-access.md`) — 조회·테스트 데이터 조작은 가능, 스키마 변경은 불가. |

### 4-2. 프론트가 알아야/지켜야 하는 것

| 항목 | 내용 |
|---|---|
| **배포는 인프라 무관** | Vercel이 프론트 배포를 담당 — OCI/CD 파이프라인과 별개다. 단 Vercel 계정이 아직 박일하 개인 계정에 묶여 있다(`pm/docs/ops.md` 미결 리스크). |
| **백엔드 연결** | 브라우저는 `likelion-khu.com`으로만 요청하고, Next.js 서버사이드 rewrite가 `/api/*`를 백엔드(OCI)로 프록시한다 — CORS 설정 불필요, 백엔드 주소도 브라우저에 노출 안 됨. 환경변수 `BACKEND_URL`(서버 전용). |
| **도메인·DNS 변경** | nginx가 도메인별 라우팅(`api.prod.`·`api.stage.`)을 하드코딩하고 있어, 도메인 구조를 바꾸려면 인프라와 먼저 협의 — nginx 설정·SSL 인증서 도메인 목록에 영향. |

### 4-3. 인프라가 두 팀에 공통으로 요구하는 것

- **`infra/**` 변경은 항상 브랜치+PR** — 이 레포의 정책(pm/ 예외는 pm 디렉터리 한정, infra는 코드든 문서든 예외 없음).
- **시크릿은 절대 커밋 금지** — `.env.*.example` 템플릿만 갱신, 실제 값은 서버 또는 비밀번호 관리자.
- **새 쓰기(POST/PUT/PATCH/DELETE) 엔드포인트를 추가할 때** 인증·인가 가드가 "경로 화이트리스트"가 아니라 "메서드 기준"으로 걸려 있는지 확인(learnings 참고 — 경로 기준은 새 엔드포인트가 추가될 때마다 구멍이 반복됐던 전례가 있다). 인프라 영역은 아니지만 배포 파이프라인이 그 가드를 우회 못 하게 하는 전제라 언급.

---

## 5. 갱신 규칙

- **infra 구성이 바뀌면(새 알람, 새 서비스, 배포 절차 변경 등) 같은 PR 안에서 이 문서도 갱신한다** — 별도 후속 작업으로 미루지 않는다(그래야 다음에 이 문서를 읽는 사람이 실제 상태와 어긋나지 않는다).
- **새 알람이 생기면 2절에 같은 형식(의미 한 줄 → 복사·실행용 코드블록 → "다음" 한 단락)으로 추가하고, 커밋 전에 실제로 한 번 실행해 결과를 확인한다.**
- **실제로 겪은 사고·함정은 여기가 아니라 `pm/docs/learnings.md`에 남긴다** — 이 문서는 "지금 뭘 해야 하는지"만 담고, "왜 그렇게 됐는지"는 learnings와 각 주제별 문서(`observability.md` 등)가 담당한다. 중복 서술은 drift를 만든다.
