# 인프라 운영 러너북 — 마인드셋 · 지표 · 알람 대응 · 평소 루틴 · 협업 인터페이스

> 오너: 장찬욱(@cjang3285). **살아있는 문서** — infra를 바꾸면 같은 PR에서 이 문서도 같이 갱신한다(아래 "갱신 규칙" 참고).

## 이 문서가 왜 필요한가

다음 기수로 인수인계하기 위해.

그래서 이 문서는 다섯 가지를 묶는다:
1. **마인드셋** — 이 역할의 본질적 목표가 뭔지.
2. **지표** — 그 목표를 향해 가고 있는지 뭘 보고 판단하는지.
3. **역량** — 인프라 담당자(나 자신, 또는 다음 담당자)가 최소한 할 수 있어야 하는 것.
4. **대응 절차(runbook)** — 알람이 울렸을 때 "이게 왜 왔고, 무엇을 의심할 것이며, 뭘 해야 하는지".
5. **평소 루틴** — 알람이 없는 평상시에 뭘 하거나, 하지 말아야 하는지, 전임자가 운영하면서 익힌 기본적인 감각들과 동적인 머릿속 그림을 공유하는 것.
6. **협업 인터페이스** 인프라 입장에서 한 조치가 백엔드·프론트·PM과 어떻게 맞물리는지, 인프라의 행동이 어떻게 그들에게 영향을 주며, 이를 늦지 않게 공유하기 위해 그들이 이해할 언어로 어떻게 공지할지. 

왜 인프라를 이렇게 만들었는지는 각 주제별 문서(`observability.md`·`uptime-monitoring.md`·`db-access.md`·`logging.md`)에 이미 있다 — 이 문서의 설명 이상으로 궁금한 점이 생기거나 트러블슈팅을 위한 배경지식이 필요하면 링크를 따라간다.

---

## 0. 먼저 읽을 지도

| 문서 | 뭘 담고 있나 |
|---|---|
| [`infra/CLAUDE.md`](./CLAUDE.md) | 아키텍처 한눈에, 브랜치↔환경 대응, 파일 목록, OCI 무료 티어 한도표 |
| `pm/docs/handoff.md` | 인수인계 전체 그림 — 뭐가 이미 자동화됐고, 뭐가 아직 담당자에게 묶여 있는지 |
| [`observability.md`](./observability.md) | 디스크·메모리·백업 알람의 설계 경위· 메트릭 조회 함수의 이해 |
| [`uptime-monitoring.md`](./uptime-monitoring.md) | UptimeRobot 설계 경위·한계 |
| [`db-access.md`](./db-access.md) | DB 접속·Flyway 경계·백업 전략 |
| [`.claude/skills/db-access/SKILL.md`](./.claude/skills/db-access/SKILL.md) | 팀원의 DB 관련 질문(접속법·SQL 허용여부·GUI·공개키 등록)에 이 Claude Code가 `db-access.md` 기반으로 즉답하게 하는 스킬 — 팀원 셀프서비스의 실제 동작 원리, 다음 담당자도 이 스킬을 그대로 물려받아 유지보수한다 |
| [`../backend/.claude/skills/db-man/SKILL.md`](../backend/.claude/skills/db-man/SKILL.md) | **위치는 `backend/`(엔티티 변경 시 자동 트리거되게 스코프한 것)지만 장찬욱(인프라)이 Flyway 도입(#133) 때 같이 만들고 관리하는 스킬** — 엔티티 변경 시 마이그레이션 파일을 빠뜨리지 않게, SQLite ALTER 제약·PK/FK 타입 짝·CD 롤백이 스키마까지 되돌리지 않는다는 함정 등을 담고 있다. 인프라 인수인계 시 db-access와 같이 넘겨야 하는 스킬 |
| [`logging.md`](./logging.md) | 로그 구조 |
| [`CI-CD.md`](./CI-CD.md) | CI CD 절차 설명 |
| `pm/docs/learnings.md` "인프라 · CI/CD" 절 | 실제 사고 히스토리 — 같은 함정을 반복하지 않기 위한 원본 |

---

## 1. 마인드셋 — 이 문서가 추구하는 것

이 역할의 목표는 

**1. 유저가 서비스에 접근하여 본인의 요구를 충족하고 돌아갈 수 있도록 한다"**

**2. 개발 과정 전반에서 팀 전체가 인프라를 신경 쓰지 않고 자기 일에 집중할 수 있게 만든다.**

인프라 설계 및 관리, CI/CD, 코드 품질 유지, 알람 설정 및 대응, 다양한 상황에 대비하여 배포전략을 준비하는 등 모든 것은 위 목표를 위한 것이다. 

**이 역할을 물려받는 사람에게**: 이 문서에 적힌 절차를 그대로 따라 하기만 해서는 안 된다. 팀 규모, 트래픽, 무료 티어 정책, 팀원 각자의 필요는 계속 바뀌는데 문서만 고정돼 있으면, 그 문서 자체가 다음 병목이 된다. **여기 적힌 걸 참고하되, 상황에 안 맞으면 스스로 판단해서 고치고 이 문서도 같이 갱신하는 것**이다. 

### 실제 일하는 방식

이 런북과 관련 문서들은 한 번에 완성되지 않았다. 아래 순서를 반복하면서 만들어졌고, 다음 담당자도 이 순서를 그대로 가져가면 된다:

1. **알람을 기다리지 않고 스스로 이상한 걸 찾는다.** 문서 작업을 하다가도 "이 설명이 지금 실제 서버 상태랑 맞나?"를 계속 의심해본다. 실제로 이 과정에서 `infra/CLAUDE.md`의 "미결 사항"에 이미 끝난 일이 안 지워진 채 남아있는 것, nginx에 안 쓰는 인증서가 남아있는 것, 스테이징 도메인 설명이 실제 nginx.conf와 어긋나는 것, 서버의 `dev` 브랜치가 GitHub과 갈라져 있는 것을 전부 이런 방식으로 찾아냈다.
2. **스스로 판단할 수 있는 것(기술적으로 어떻게 할지의 문제고, 위험이 작고 되돌리기도 쉬운 것)은 조사해서 바로 고친다.** 문서가 실제와 어긋난 부분을 바로잡거나, 위험한 명령을 안전한 걸로 바꾸거나, 로그 정리를 자동화하는 것 같은 일들 — 이런 건 매번 허락받지 않는다. 대신 **왜 고쳤는지는 커밋 메시지나 문서에 반드시 남긴다.**
3. **위험하거나(되돌리기 어렵거나) 판단할 근거가 부족한 것은 실행하기 전에 먼저 검증한다.** "이 설정이 정말 안 쓰이는 게 맞나?" 같은 걸 추측으로 넘기지 않고 직접 확인한다 — grep으로 다른 곳에서 참조하고 있진 않은지 찾아보거나, 실제로 지우지 않고 결과만 미리 시험해보는(dry-run) 식으로. 이렇게 확인한 결과를 먼저 공유하고, 그다음에 "이렇게 하려는데 진행할까요?"라고 실행 여부를 명시적으로 확인받는다.
4. **범위나 우선순위를 판단해야 하거나 다른 팀에 영향이 가는 일은 혼자 결정하지 않는다.** 인프라가 기술적으로 "어떻게 할지"는 스스로 정하되, "이걸 지금 할지, 누가 결정할 일인지"가 애매하면 PM에게 넘긴다(이 레포에는 이 경계를 위한 `ask-pm` 스킬과, 이슈 타입 `Task`가 이미 마련돼 있다 — 활용할 것).
5. **뭔가 발견하면 숨기지 않고 알린다.** 지금 하던 일과 상관없는 "부수적인 발견"이라도 정리해서 알린다 — 위험도가 낮아 보여도, 그걸 지금 처리할지 말지는 팀이나 다음 담당자가 판단하게 남겨둔다.
6. **infra를 바꿀 땐 항상 브랜치를 만들고 PR을 올린다.** 혼자서도 다 판단할 수 있는 내용이라도 리뷰를 요청하고, 리뷰에서 나온 코멘트는 "맞는 말 같으니 그냥 반영"하지 않고 실제로 재현·실행해서 검증한 뒤에 반영한다.

이 순서에서 절대 빠뜨리면 안 되는 것: **"왜 그렇게 했는지"를 남기는 것.** 무엇을 결정했는지보다 왜 그렇게 결정했는지가 더 오래 쓸모 있다 — 다음 담당자가 이 문서와 다른 판단을 내려야 할 상황이 왔을 때, 예전엔 왜 이렇게 했는지를 알아야 근거를 갖고 벗어날 수 있다.

---

## 2. 무엇을 지표로 볼 것인가

"서버가 떠 있다"는 최소한 만족해야 하는 조건일 뿐, 그것만으로 잘하고 있다고 볼 수는 없다. 아래는 "팀이 인프라 때문에 덜 힘든가"를 판단하기 위한 관점들이다 — 전부 자동으로 대시보드에 뜨는 건 아니고, 상당수는 담당자가 주기적으로 직접 확인해봐야 하는 것들이다.

**이미 있는 도구로 확인 가능한 것:**

| 지표 | 어디서 보나 | 좋은 신호 |
|---|---|---|
| 배포 실패율·롤백 빈도 | GitHub Actions `cd.yml` 실행 히스토리 | 낮을수록 팀이 안심하고 자주 배포한다는 뜻 |
| 알람 발생 빈도·재발률 | OCI Monitoring Alarm 히스토리, UptimeRobot 로그 | 같은 알람이 반복되면 "대응"이 아니라 "근본 수정"이 안 된 것 |
| 비용 여유 | `infra/CLAUDE.md` 한도표 vs 실사용량(월 1회 대조, 4-6절 참고) | 예상치 못한 청구서로 팀을 놀라게 하지 않는 것 |
| 문서-실제 괴리(drift) | 주기적으로 서버 SSH 실측 대조(이 세션이 한 방식 그대로) | 이번에 발견한 것처럼, 방치하면 다음 담당자가 잘못된 전제로 판단하게 된다 |

**담당자가 스스로 판단해야 하는 것(자동 측정 없음):**

- **"인프라 때문에 막혔다"는 신호가 얼마나 자주 나오는가** — FE·BE가 배포·DB 접근·환경변수 때문에 인프라 담당자를 기다린 횟수. 이게 잦으면 셀프서비스로 옮길 대상이라는 뜻(예: DB 조회 GUI를 만든 이유가 이거였다).
- **반복되는 수동 작업이 줄고 있는가, 늘고 있는가** — 새로 발견한 수동 반복 작업(예: 로그 정리)은 자동화 후보고, 자동화했으면 그 뒤로 정말 사람이 덜 개입했는지 추적한다.
- **다음 담당자가 이 문서만 보고 실제로 판단할 수 있는가** — 문서를 못 보고도 알아서 판단하게 두지 말고, 새 사람에게 가끔 "이 상황이면 어떻게 할 것 같아?"를 물어보고 문서 공백을 찾는다.
- **의도적으로 수동으로 남긴 것과, 그냥 안 해서 수동인 것을 구분하고 있는가** — 전자(DB 접근 계정 발급, 시크릿 로테이션 등 보안 경계)는 자동화 대상이 아니다. 후자(로그 정리처럼 순수 반복 작업)는 자동화 대상이다. 이 구분을 매번 명시적으로 하는 것 자체가 지표다.

---

## 3. 인프라 담당자가 할 수 있어야 하는 것

아래를 못 하면 이 역할을 넘겨받았다고 보기 어렵다 — 인수인계 체크리스트로도 쓴다.

| 역량 | 확인 방법 |
|---|---|
| 서버 SSH 접속 | `ssh likelion-oci` (로컬 `~/.ssh/config` 등록 + `~/.ssh/oci_server.pem` 필요) |
| docker compose 스택 상태 파악 | `docker compose -f ~/website/infra/docker-compose.yml ps`, `... logs --tail=100 <service>` (`-f` 경로 빠뜨리면 기본 디렉터리에서 compose 파일을 못 찾음 — 2026-07-26 PM 리뷰로 발견) |
| 수동 배포·롤백 | 아래 5절 "자주 쓰는 명령" — **태그를 반드시 명시**해야 한다(미지정 시 위험, learnings 참고) |
| DB 접근 계정 발급 | `infra/.claude/skills/db-access/` 스킬 또는 `db-access.md` "온보딩" 절 — 공개키 등록은 서버에서 사람이 직접(자동화 안 함, 의도적) |
| OCI 콘솔·CLI 조작 | 콘솔: `Observability & Management → Monitoring`(컴파트먼트 루트, 리전 `ap-tokyo-1`). CLI: `~/.oci/config` 자격증명, JSON 인자 있는 명령은 **Bash로**(PowerShell 인코딩 문제) |
| 비용 한도 점검 | `infra/CLAUDE.md`의 Always Free 표와 실사용량 대조 — 알림이 없는 항목이라 사람이 주기적으로 봐야 함(4-6절 참고) |
| SSL 인증서 상태 확인 | `sudo certbot certificates` 또는 `/etc/letsencrypt/live/likelion-khu.com-0001/` 만료일 확인 (certbot이 자동 갱신하지만 실패 시 알림이 없음) |
| GitHub Secrets 확인·회전 | `OCI_HOST`·`OCI_USER`·`OCI_SSH_KEY`·`OCI_DEPLOY_PATH` — 레포 Settings → Secrets |
| gitleaks pre-commit 훅 | 로컬에 `git config core.hooksPath .githooks` 최초 1회 설정 필요(레포 커밋만으론 자동 적용 안 됨). 훅이 있어도 로컬에 `gitleaks` 바이너리(또는 Docker 데몬)가 없으면 조용히 건너뛴다 — `command -v gitleaks`로 실제로 설치돼 있는지 확인할 것(scoop/brew 등으로 설치) |

---

## 4. 알람 대응 절차 (Runbook)

원칙: **알람이 오면 그 메일 본문에 "왜 울렸는지"가 항상 적혀 있다.** OCI가 보내는 알람 4개는 모두 `ONS_OPTIMIZED`라는 형식으로 오는데, 쉽게 말해 어떤 지표가 어떤 값을 넘어서 울렸는지 사람이 읽기 좋게 정리된 형식이라는 뜻이다. UptimeRobot 알람은 어떤 URL이 접속 안 되는지를 명시해서 보내준다.

아래는 **이 일을 처음 하는 사람도 그대로 복사해서 자기 로컬 터미널에 붙여넣기만 하면 되도록** 알람 항목마다 실행할 명령을 한 블록으로 묶어뒀다. 필요한 사전 준비는 SSH 접속 설정(`~/.ssh/config`, 키 파일)뿐이고, 이건 3절에 안내돼 있다.

> 아래 명령은 전부 2026-07-26에 실제 서버(`ssh likelion-oci`)에 접속해서 하나씩 직접 실행해보고 결과까지 확인한 것들이다(디스크 정리·메모리 재기동·백업 재실행까지 실제로 돌려서 성공을 확인했다) — "이론상 맞을 것 같은 명령"이 아니라 "실제로 돌려본 명령"이라는 뜻이다. 다음에 이 문서에 명령을 추가하거나 고칠 때도 이 원칙을 지킬 것: **명령을 추가·수정하면 실제로 한 번 실행해서 결과를 확인한 뒤에 커밋한다.**

### 4-1. OCI Monitoring — 디스크 사용률 80% 초과 (CRITICAL)

**무슨 뜻인가**: 서버의 루트 디스크(`/`) 사용률이 5분 넘게 80%를 넘었다는 뜻이다. 이 서버는 무료 티어 한도가 부트 볼륨+블록 볼륨 합쳐서 200GB인데, 여기서 잡는 기준(80%)은 그보다 훨씬 낮은 수치라 아직 여유가 있을 때 미리 알려주는 조기 경보다.

```bash
ssh likelion-oci 'df -h / && echo --- && docker system df && echo --- && du -sh /home/ubuntu/website/infra/logs/* /home/ubuntu/backups 2>/dev/null'

ssh likelion-oci 'docker image prune -f'
# ↑ 태그 없는(dangling) 이미지만 지운다 — 절대 -a를 쓰지 말 것. -a는 실행 중이지 않은
#   모든 이미지를 지우는데, 여기엔 "수동 롤백"(5절)에 필요한 이전 버전 태그 이미지도
#   포함된다. 이 실수를 실제로 할 뻔했다가 시스템이 막아서 알게 됨(2026-07-26).

ssh likelion-oci 'df -h /'   # 정리 후 재확인
```

**그다음엔**: `infra/logs/{stage,prod}/`에 쌓인 로그 중 30일 넘은 건 `cleanup-old-logs.sh`가 매일 자동으로 지워준다(2026-07-26에 추가함). 그런데도 디스크 사용률이 안 줄면, 원인이 로그가 아니라 다른 것(도커 이미지나 볼륨 등)이라는 뜻이니 위에서 확인한 `docker system df` 결과부터 다시 살펴볼 것. 며칠 안에 다시 재발하거나 200GB에 점점 가까워지는 추세라면 김우진에게 공유한다 — 블록 볼륨을 늘리려면 그게 무료 한도(200GB) 안에 들어오는지부터 먼저 확인해야 한다.

### 4-2. OCI Monitoring — 메모리 사용률 85% 초과 (CRITICAL)

**무슨 뜻인가**: 메모리 사용률이 5분 넘게 85%를 넘었다는 뜻이다. 이 서버는 CPU 2코어·메모리 12GB로 고정돼 있고(무료 티어 한도라 늘릴 수 없음) 스왑 메모리도 없어서, 메모리가 다 차면 바로 문제가 생긴다.

```bash
ssh likelion-oci 'free -m && echo --- && docker stats --no-stream'

ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml restart backend-stage'
# ↑ 위 docker stats에서 메모리를 크게 물고 있던 서비스로 바꿔서 실행 (backend-prod 등)

sleep 30   # Spring Boot 기동에 20~30초 걸린다 — 재기동 직후 바로 확인하면 000(연결 실패)이 뜬다(실측 확인)
ssh likelion-oci 'curl -s -o /dev/null -w "재기동 후:%{http_code}\n" http://localhost:8081/actuator/health && free -m'
```

**그다음엔**: 이 알람이 반복해서 온다면 재기동으로 넘어갈 게 아니라 근본 원인(메모리 누수 등)을 의심하고 신선우·안시현에게 공유한다(7절 참고). 서버 자체를 재부팅하는 건 최후의 수단으로만 — 재부팅 자체는 안전하다고 실제로 확인했지만, 원인을 알아낼 단서(로그 등)가 같이 날아간다. 스펙을 올리는 것(4 OCPU/24GB로)은 **무료 티어를 벗어나는 일**이라 김우진의 결정이 필요하다.

### 4-3. OCI Monitoring — DB 백업 26시간 이상 부재 (prod/stage, CRITICAL)

**무슨 뜻인가**: 이 알람은 백업이 실패했다는 걸 직접 감지하는 게 아니라, "마지막으로 백업 성공 신호가 온 지 26시간이 지났다"는 것만 본다(이런 방식을 **dead man's switch**라고 부른다 — 정상이면 계속 살아있다는 신호를 보내야 하고, 그 신호가 끊기면 무슨 이유에서든 문제가 생겼다고 간주하는 방식). 그래서 이 알람이 울렸다는 건 "백업 내용이 이상하다"가 아니라 "백업이 됐다는 신호 자체가 안 왔다"는 뜻이다 — 원인은 지금부터 찾아야 한다.

```bash
ssh likelion-oci 'tail -20 ~/backup.log && echo --- && crontab -l | grep backup-db && echo --- && git -C ~/website ls-tree HEAD -- infra/backup-db.sh'
# ↑ 마지막 줄이 100755가 아니면(예: 100644) 실행권한이 벗겨진 것 — 아래 "다음" 참고

ssh likelion-oci 'cd ~/website/infra && bash backup-db.sh && echo --- && tail -5 ~/backup.log'
# ↑ 수동 1회 실행 — prod·stage 업로드 + 메트릭 전송까지 성공하면 다음 평가 주기에 알람이 OK로 전환된다
```

**그다음엔**: 위 `git ls-tree` 결과가 `100644`(실행 권한 없음)로 나왔다면, 서버에는 예전에 걸어둔 `chmod +x`(실행 권한 부여)만 남아있고 정작 git에는 그 실행 권한이 기록돼 있지 않은 상태다. 이럴 땐 `git -C ~/website update-index --chmod=+x infra/backup-db.sh`를 실행해 git에도 실행 권한을 기록한 뒤 커밋하고, **`dev`·`main` 두 브랜치 모두에** 머지해야 한다(한쪽만 하면 나중에 다른 쪽을 배포할 때 그 배포가 다시 덮어써 버린다). 자주 나오는 다른 원인은 줄바꿈 문자(CRLF)가 섞여서 스크립트 맨 앞의 실행 방식 지정(셔뱅)이 깨지는 경우인데, 이건 `.gitattributes` 설정으로 이미 막아뒀으니 혹시 모르니 재확인만 한다. 이 두 가지 다 아니라면(버킷 접근 권한이 만료됐다든지) 근본적인 수정이 필요한 PR을 올려야 한다 — 그 사이엔 급한 대로 하루 더 수동으로 백업을 돌리면서 원인을 조사한다.

### 4-4. OCI Monitoring — 배포서버 git 드리프트 감지 (CRITICAL)

**무슨 뜻인가**: 서버에 있는 git 저장소에, git이 아직 추적하지 않는(커밋되지 않은) 변경이 생겼다는 뜻이다. 누군가 SSH로 서버에 들어가 파일을 직접 고쳤거나, 새로 생긴 데이터·로그 폴더를 `.gitignore`에 안 넣었거나, 아직 머지 안 된 브랜치를 서버에서 먼저 테스트해봤을 때 주로 생긴다.

```bash
ssh likelion-oci 'git -C ~/website status --porcelain'
```

**그다음엔**: 위에서 나온 파일이 **서버에만 있으면 되는, 원래 의도된 파일**(새로 생긴 로그·데이터 폴더 등)이라면, 로컬에서 `.gitignore`에 추가하고 커밋·푸시한다 — 이러면 근본적으로 고쳐지는 거라 이 알람 자체가 다시는 안 뜬다. 반대로 **누군가 실수로 고친 흔적**이라면, 그 변경이 정말 필요한 건지 판단해서 커밋하거나, `ssh likelion-oci 'git -C ~/website checkout -- <path>'`로 원래대로 되돌린다. **어느 쪽이든 다음 배포 전에 반드시 정리해야 한다** — 안 그러면 배포가 실패하거나, 배포 과정에서 이 변경이 덮어써져서 방금 한 판단 자체가 무의미해진다. (참고로 이 알람은 아직 커밋 안 된 변경만 감지한다 — 이미 커밋은 됐는데 원격 저장소(origin)와 내용이 갈라진 경우는 이 알람으로는 못 잡는다는 빈틈이 있다. 자세한 건 `observability.md` 참고.)

### 4-5. UptimeRobot — DOWN (api.prod / api.stage / likelion-khu.com / dev.likelion-khu.com)

**무슨 뜻인가**: 외부에서 사이트나 API에 접속이 안 된다는 뜻이다. 서버에 SSH로 들어가지 않고도 아래 명령으로 먼저 상태를 확인할 수 있다:

```bash
curl -s -o /dev/null -w 'prod:%{http_code}\n'  https://api.prod.likelion-khu.com/actuator/health
curl -s -o /dev/null -w 'stage:%{http_code}\n' https://api.stage.likelion-khu.com/actuator/health
curl -s -o /dev/null -w 'front-prod:%{http_code}\n' https://likelion-khu.com
curl -s -o /dev/null -w 'front-dev:%{http_code}\n'  https://dev.likelion-khu.com
```

**어떻게 판단하나**: **prod와 stage 백엔드가 동시에** DOWN이면 인스턴스 자체에 문제가 생겼을 가능성이 크다(둘 다 같은 OCI 인스턴스에서 돈다). **하나만** DOWN이면 그 서비스만의 개별 문제다. **프론트 두 개만** DOWN이면 인프라(OCI)와는 무관한 Vercel 쪽 문제다(7절 참고).

백엔드가 DOWN이면 서버로 들어가 원인을 확인한다:

```bash
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml ps'
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml logs --tail=100 backend-prod'
# ↑ 대상 서비스로 바꿔서(backend-stage 등). ssh 자체가 안 되면 인스턴스 문제 — OCI 콘솔에서 인스턴스 상태부터 확인
```

**그다음엔**: 컨테이너가 뜨자마자 계속 죽었다 살아나기를 반복하는 상태(크래시 루프)라면, 로그에서 원인을 확인한 뒤 재기동한다(4-2절 재기동 명령을 그대로 쓰면 된다). 최근에 배포한 게 원인으로 의심되면 5절 "수동 롤백"을 참고한다. **5분짜리 확인 틈새를 주의할 것**: UptimeRobot 무료 플랜은 5분에 한 번씩만 확인하기 때문에, 5분보다 짧게 끝난 장애(잠깐의 재부팅 등)는 알림이 아예 안 올 수도 있다(실측 근거는 `uptime-monitoring.md`). 그러니 "알림이 안 왔으니 문제가 없었다"고 넘겨짚으면 안 된다.

### 4-6. (알람은 아니지만) 비용 한도 — 루틴 점검 필요

OCI 무료 티어를 초과해도 **알림이 오지 않는다**(예산 알림은 체험용 크레딧이 소진되기 전엔 안 울릴 수 있다 — `infra/CLAUDE.md` 참고). 그래서 한 달에 한 번 정도는 `infra/CLAUDE.md`에 있는 한도표와 실제 사용량(컴퓨트 OCPU·메모리, 스토리지, Email Delivery 월 3,000통 한도)을 직접 대조해보는 걸 루틴으로 잡아둔다.

---

## 5. 자주 쓰는 명령 (Cheat sheet)

여기도 전부 그대로 복사해서 실행하면 되도록 썼다. `<브랜치>`·`<커밋SHA>`·`<서비스>` 자리만 상황에 맞는 값으로 채우면 된다.

**수동 배포·재기동 — 이미지 태그를 반드시 직접 지정할 것**. 태그를 안 적으면 로컬에 캐시된 옛날 이미지를 쓰거나, 이 서버 아키텍처(arm64)와 안 맞는 `latest` 이미지가 받아질 수 있다(자세한 사고 경위는 learnings 참고). 아래는 실제로 지금 배포돼 있는 태그를 넣어 실행해서 — 이미 최신이라 컨테이너가 새로 만들어지지 않는 것까지 — 확인한 형태다:

```bash
ssh likelion-oci 'cd ~/website/infra && STAGE_TAG=stage-<커밋SHA> docker compose -f docker-compose.yml up -d backend-stage'
ssh likelion-oci 'cd ~/website/infra && PROD_TAG=prod-<커밋SHA>   docker compose -f docker-compose.yml up -d backend-prod'
```

**수동 롤백** — 배포 자동화(CD)가 실패하면 원래 자동으로 롤백되지만, 그걸로도 안 되면 위 명령에 이전에 정상 동작했던 태그를 넣어 그대로 실행하면 된다.

**`infra/**`만 바뀐 걸 배포할 때**: CD는 `backend/**`나 `shared/**` 폴더가 바뀐 경우에만 자동으로 돈다. 그래서 `docker-compose.yml`처럼 `infra/**` 안의 파일만 고친 커밋은 자동 배포가 안 되고, 서버에서 수동으로 반영해야 한다 — 이때 **CD(`cd.yml`)가 하는 것과 똑같은 방식으로, 배포하려는 브랜치를 명시적으로 지정해서 전환**한다:

```bash
ssh likelion-oci 'cd ~/website && git fetch origin && git checkout -f <브랜치> && git pull origin <브랜치>'
ssh likelion-oci 'cd ~/website/infra && docker compose up -d <바뀐 서비스>'
```

여기서 `git checkout -f <브랜치>` 없이 `git pull origin <브랜치>`만 실행하면, 브랜치를 전환하지 않고 **지금 체크아웃돼 있는 브랜치에 그대로 병합**해버린다. 예를 들어 지금 서버에 `main`이 체크아웃돼 있는 상태에서 `dev`용 변경을 배포하려고 이 명령만 실행하면, `dev`의 내용이 `main`에 섞여 들어간다. 그래서 반드시 `git checkout -f <브랜치>`로 먼저 원하는 브랜치로 전환한 뒤에 pull해야 한다(2026-07-26 PM 리뷰에서 이 문제를 발견해 고쳤다).

**주의할 점 — 서버에 있는 `dev` 브랜치가 GitHub의 `origin/dev`와 커밋 단위로 어긋나 있을 수 있다**(2026-07-26에 실제로 확인한 수치: 서버에만 있는 커밋 26개, GitHub에만 있는 커밋 16개). 원인은 서버가 GitHub에 등록해둔 배포용 키가 읽기 전용이라, `git pull`을 하면서 생기는 병합 커밋을 다시 GitHub으로 push하지 못해서 이런 어긋남이 계속 쌓인 것이다(자세한 경위는 `pm/docs/learnings.md` 참고). 실제로 병합을 미리 시험해보는 방법(`git merge --no-commit --no-ff origin/dev` 실행 후 `git merge --abort`로 취소)까지 써서 **지금 이 둘을 합쳐도 충돌 없이 깨끗하게 합쳐진다는 것까지 확인**했으니 당장 급한 문제는 아니다. 다만 서버가 push를 못 하는 구조가 그대로 남아있는 한 이 어긋남은 배포할 때마다 계속 쌓인다. 혹시 다음에 정말 충돌이 나는 상황이 오면, 절대 `-X ours`나 `-X theirs` 같은 옵션으로 한쪽 편을 들어 임의로 밀어붙이지 말고 먼저 장찬욱에게 확인할 것.

**DB 접근 계정 발급**: `infra/.claude/skills/db-access/` 스킬 호출 또는 `db-access.md` "온보딩" 절 그대로 — 공개키를 받아 서버에서 직접 등록(자동화하지 않은 이유는 그 문서에 있음).

### DB 복원 — 백업 스냅샷으로 되돌리기

**언제 쓰나**: 실수로 데이터가 잘못 들어갔거나, 배포·마이그레이션이 데이터를 망가뜨렸거나, DB 자체가 손상됐을 때 — 매일 자동으로 뜨는 백업(`db-access.md` "백업 전략")이 `likelion-backups`라는 별도 저장소(OCI Object Storage 버킷)에 prod·stage 각각 최근 30일치 쌓여 있어서, 그중 하나를 골라 지금의 DB 파일을 통째로 그 시점 것으로 바꿔치기할 수 있다. 아래 절차·명령은 전부 2026-07-27에 실제로 실행해서 결과까지 확인한 것이다(원래 백업 스크립트엔 업로드만 있고 다운로드 기능이 없어서, 이번에 `backup_upload.py`에 `get`(내려받기)·`list`(목록 보기) 명령을 추가했다).

> ⚠️ **한 번 복원하면 되돌릴 수 없다**: 복원은 "그 스냅샷을 뜬 시점 이후에 쌓인 모든 데이터(새 글·댓글·가입 등)를 버리고 그 시점으로 되감는" 것이다. 그래서 최후 수단으로만 쓴다 — 잘못 들어간 데이터 몇 건만 지우면 되는 상황이면 굳이 전체를 되돌리지 말고 `dbclient`로 그 데이터만 `DELETE`/`UPDATE`하는 게 낫다(`db-access.md` Flyway 기준 참고). prod를 복원하기 전엔 반드시 백엔드(신선우·안시현)에게 먼저 알려서, 그 시점 이후 그들이 넣어둔 데이터가 있는지부터 확인할 것.
>
> ⚠️ **너무 오래된 백업은 복원하면 앱이 아예 안 켜진다(실제로 재현해서 확인함)**: 이 프로젝트는 2026-07-23에 Flyway(스키마 버전 관리 도구)를 처음 도입했다. Flyway는 "지금까지의 스키마 변경 이력"을 DB 안에 기록해두고 시작하는데, 도입 당시 이미 있던 스키마는 "V1까지는 이미 다 적용된 걸로 치고 건너뛴다"는 식으로 처리했다(baseline). 문제는 이 처리 방식이 "지금 연결한 DB가 실제로 그 V1 상태와 같은 모양"이라고 그냥 믿고 넘어간다는 것 — 만약 Flyway 도입 **이전** 시점의 옛날 백업을 복원하면, 그 옛 스키마는 V1이 가정하는 모양과 다를 수 있고, 그러면 다음 마이그레이션이 "있어야 할 컬럼이 없다"며 앱 기동 자체가 실패해버린다. 실제로 2026-07-17 stage 백업(도입일 이전)으로 복원을 재현해봤더니, `V2__member_offboarding_and_cohort_unique.sql` 마이그레이션이 `no such column: failed_login_attempts`(그런 컬럼이 없다) 에러로 죽으며 기동이 실패했다. 반면 **2026-07-24 이후 백업은 정상적으로 기동되는 것까지 실제로 확인했다.** → **복원할 백업은 항상 2026-07-24 이후 날짜로만 고를 것.**

**전체 흐름(먼저 그림부터)**: ① 몇 월 며칠 백업으로 되돌릴지 목록에서 고른다 → ② 그 백업을 일단 안전한 임시 장소에 내려받아 파일 자체가 멀쩡한지 확인한다(아직 실제 서비스는 안 건드림) → ③ 서비스를 잠깐 멈춘다 → ④ 지금 쓰던 DB 파일을 혹시 몰라 옆에 복사해두고, 검증된 백업 파일로 교체한다 → ⑤ 서비스를 다시 켜고 정상인지 확인한다. 아래 명령을 그 순서 그대로 복붙하면 된다. `<db>`엔 `prod` 또는 `stage`, `<날짜>`엔 `2026-07-25`처럼 실제 날짜를 넣는다.

```bash
# ① 이 DB(prod 또는 stage)에 어떤 날짜의 백업이 남아있는지 목록으로 확인한다. 2026-07-24 이전 날짜는 위 경고 때문에 고르지 않는다.
ssh likelion-oci 'cd ~/website/infra && set -a && source .env.backup && set +a && python3 backup_upload.py list <prod|stage>'

# ② 고른 백업을 홈 디렉터리의 임시 폴더(~/restore-tmp)에 내려받고, 파일이 안 깨졌는지 검사한다 — 이 단계는 실제 서비스에 아무 영향 없다.
ssh likelion-oci 'cd ~/website/infra && set -a && source .env.backup && set +a && mkdir -p ~/restore-tmp && python3 backup_upload.py get <db>/<db>-<날짜>.db ~/restore-tmp/<db>-<날짜>.db && sqlite3 ~/restore-tmp/<db>-<날짜>.db "PRAGMA integrity_check;"'
# ↑ 결과가 "ok"인지 반드시 눈으로 확인한 뒤에만 다음 단계로 넘어간다. "ok"가 아니면 다른 날짜로 다시 시도한다.

# ③ 서비스를 멈춘다 — DB 파일을 쓰고 있는 상태에서 교체하면 안 되고, 이 순간부터 재기동 전까지는 요청이 실패한다(다운타임 발생, 아래 "고급" 절차는 이걸 없앤 버전).
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml stop backend-<stage|prod>'

# ④ 만약을 대비해 지금 쓰던(교체 전) DB 파일을 이름을 바꿔 옆에 남겨두고, 그 자리에 검증된 백업 파일을 넣는다. 소유권·권한도 원래 라이브 파일과 똑같이 맞춰준다(db-access.md 참고 — root:dbaccess, 660).
ssh likelion-oci 'cp -a ~/website/infra/data/<db>.db ~/website/infra/data/<db>.db.before-restore.$(date +%F-%H%M)'
ssh likelion-oci 'cp ~/restore-tmp/<db>-<날짜>.db ~/website/infra/data/<db>.db && sudo chgrp dbaccess ~/website/infra/data/<db>.db && sudo chmod 660 ~/website/infra/data/<db>.db'

# ⑤ 서비스를 다시 켜고 정상인지 확인한다 (Spring Boot가 뜨는 데 20~30초 걸리니 바로 확인하면 아직 연결 실패로 나올 수 있다 — 4-2절과 동일한 현상).
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml up -d backend-<stage|prod>'
sleep 30
ssh likelion-oci 'curl -s -o /dev/null -w "복원 후:%{http_code}\n" http://localhost:<8081|8080>/actuator/health && sqlite3 ~/website/infra/data/<db>.db "PRAGMA integrity_check;"'
```

**뭔가 잘못됐으면**: ④에서 옆에 남겨둔 `<db>.db.before-restore.*` 파일을 다시 `<db>.db`라는 이름으로 되돌리고 ④~⑤를 다시 실행하면, 복원하기 전 상태로 돌아간다. **뒷정리**: 헬스체크와 데이터가 다 정상이라고 확신하면 `~/restore-tmp`는 지워도 되지만, 옆에 남겨둔 `<db>.db.before-restore.*`는 혹시 모르니 며칠(최소한 다음 백업이 한 번 더 돌 때까지) 남겨두고, 확실해진 뒤에 수동으로 지운다.

---

### 고급 절차 — 서비스를 끄지 않고 복원하기(무중단)

위 절차는 ③에서 서비스를 잠깐 멈추기 때문에, 재기동될 때까지 20~30초 정도 그 DB를 쓰는 API가 응답하지 않는다. 트래픽이 많은 시간대라 이 잠깐의 끊김도 피하고 싶다면, 아래처럼 **기존 서비스는 그대로 켜둔 채 옆에 복원된 데이터를 담은 컨테이너를 하나 더 띄우고, 그게 정상으로 뜨는 걸 확인한 다음, 손님을 안내하는 입구(nginx)만 그 새 컨테이너 쪽으로 살짝 돌리는** 방식을 쓸 수 있다. 트래픽이 완전히 새 컨테이너로 넘어간 뒤에야 옛 컨테이너를 정리하므로, 사용자 입장에서는 끊기는 순간이 없다(이런 "새 걸 옆에 켜두고 검증한 뒤 트래픽만 넘기는" 방식을 흔히 **블루-그린 배포**라고 부른다).

**검증 범위**: ①~④(임시 컨테이너 기동 → 헬스체크 → nginx를 그 컨테이너로 전환 → 정상 확인)는 2026-07-27에 실제 stage 트래픽으로 검증했다(전환 전후로 외부 모니터링(UptimeRobot) 로그가 끊김 없이 계속 200을 받았다). ⑤(정식 컨테이너로 되돌리며 마무리하는 부분)는 위 "단순 복원" 절차의 ③~⑤와 완전히 같은 동작이라 별도로 다시 검증하지는 않았다. **처음 해보는 거면 반드시 stage로 먼저 연습해볼 것.**

먼저 용어 두 개만 짚고 가면 아래 명령이 이해된다:
- **override 컴포즈 파일**: `docker compose`는 원래 설정 파일(`docker-compose.yml`)은 그대로 둔 채, `-f 원본.yml -f 추가.yml`처럼 여러 파일을 겹쳐서 임시로 서비스를 하나 더 추가할 수 있다. 아래에서 만드는 `docker-compose.restore.yml`이 그 "임시로 얹는 파일"이다 — 작업이 끝나면 지운다(원본 파일도, nginx 설정도 건드리지 않는다).
- **nginx reload**: nginx(트래픽 입구 역할을 하는 프로그램)에게 "설정 다시 읽어라"라고 알려주는 것. 이미 맺어진 연결은 안 끊고, 그 다음 요청부터만 새 설정(어느 컨테이너로 보낼지)을 따른다 — 그래서 여기선 이걸 이용해 끊김 없이 트래픽을 옮긴다. 다만 설정 파일에 오타가 있으면 nginx가 그대로 멈출 수 있어서, reload 전에 항상 `nginx -t`(문법만 검사)로 먼저 확인해야 한다.

```bash
# ① 복원할 백업(2026-07-24 이후 것만 — 위 스키마 경고 참고)을, 지금 쓰는 데이터 폴더가 아니라 별도 폴더(data-restore)에 받아 검증해둔다.
ssh likelion-oci 'cd ~/website/infra && mkdir -p data-restore && set -a && source .env.backup && set +a && python3 backup_upload.py get <db>/<db>-<날짜>.db data-restore/<db>.db && sqlite3 data-restore/<db>.db "PRAGMA integrity_check;" && sudo chgrp dbaccess data-restore/<db>.db && sudo chmod 660 data-restore/<db>.db'

# ② 위에서 준비한 데이터 폴더를 바라보는 컨테이너를 하나 더 띄운다. 기존 backend-<stage|prod>는 이 사이 계속 트래픽을 받고 있고 전혀 영향 없다.
ssh likelion-oci "cat > ~/website/infra/docker-compose.restore.yml <<'EOF'
services:
  backend-<stage|prod>-restore:
    image: ghcr.io/likelion-khu-official/website/backend:\${<STAGE_TAG|PROD_TAG>:-<stage|prod>-latest}
    env_file:
      - .env.<stage|prod>
    environment:
      - LOG_FILE_PATH=/app/logs/restore-verify.log
    volumes:
      - ./data-restore:/app/data
      - ./logs/<stage|prod>:/app/logs
    ports:
      - \"127.0.0.1:8092:8080\"
    restart: \"no\"
EOF"
ssh likelion-oci 'cd ~/website/infra && docker compose -f docker-compose.yml -f docker-compose.restore.yml up -d backend-<stage|prod>-restore'

# ③ 이 새 컨테이너를 127.0.0.1:8092(서버 안에서만 보이는 포트)로 직접 찔러서 정상 기동했는지 확인한다. 아직 실제 트래픽은 안 건드렸다.
#    실패하면(Flyway 에러 등) 여기서 멈추고 로그부터 볼 것 — 아직 아무것도 전환 안 했으니 그냥 이 컨테이너만 지우면 된다.
ssh likelion-oci 'for i in $(seq 1 15); do code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8092/actuator/health); [ "$code" = "200" ] && echo healthy && break; sleep 2; done'
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml -f ~/website/infra/docker-compose.restore.yml logs --tail=50 backend-<stage|prod>-restore'

# ④ 새 컨테이너가 정상이면, nginx가 트래픽을 보내는 대상을 이 컨테이너로 바꾼다. 되돌릴 수 있게 지금 설정을 먼저 백업해두고, 문법 검사(nginx -t)를 통과한 뒤에만 reload한다.
ssh likelion-oci 'cp ~/website/infra/nginx.conf ~/nginx.conf.beforecutover'
ssh likelion-oci 'sed -i "s#proxy_pass       http://backend-<stage|prod>:8080;#proxy_pass       http://backend-<stage|prod>-restore:8080;#" ~/website/infra/nginx.conf'
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml exec nginx nginx -t'
# ↑ "syntax is ok" / "test is successful"이 나온 걸 확인한 뒤에만 아래를 실행한다:
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml exec nginx nginx -s reload'
ssh likelion-oci 'curl -s -o /dev/null -w "%{http_code}\n" https://api.<stage|prod>.likelion-khu.com/actuator/health'
# ↑ 200이 나오면 지금부터 실제 트래픽이 새 컨테이너(복원된 데이터)로 가고 있는 상태다 — 연결이 끊기지 않고 전환된 것까지 실측으로 확인했다.

# 문제가 있으면 여기서 바로 되돌린다(옛 컨테이너는 이 사이 계속 켜져 있었으므로 즉시 원래 상태로 복귀):
ssh likelion-oci 'cp ~/nginx.conf.beforecutover ~/website/infra/nginx.conf && docker compose -f ~/website/infra/docker-compose.yml exec nginx nginx -t && docker compose -f ~/website/infra/docker-compose.yml exec nginx nginx -s reload'

# ⑤ 문제가 없다고 확신하면 — 이제 트래픽이 없는 옛 컨테이너를 정리하고, 정식 자리에도 이 데이터를 반영해서 원래 구조(임시 컨테이너 없이 backend-<stage|prod> 하나)로 되돌린다.
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml stop backend-<stage|prod>'
ssh likelion-oci 'cp -a ~/website/infra/data/<db>.db ~/website/infra/data/<db>.db.before-restore.$(date +%F-%H%M)'   # 만약을 위한 안전망
ssh likelion-oci 'cp ~/website/infra/data-restore/<db>.db ~/website/infra/data/<db>.db && sudo chgrp dbaccess ~/website/infra/data/<db>.db && sudo chmod 660 ~/website/infra/data/<db>.db'
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml up -d backend-<stage|prod>'
sleep 30
ssh likelion-oci 'curl -s -o /dev/null -w "%{http_code}\n" http://localhost:<8081|8080>/actuator/health'
# ↑ 이 시점엔 실제 트래픽은 아직 임시 컨테이너(-restore)가 받고 있으므로, 여기서 실패해도 사용자에게는 영향이 없다 — 안심하고 확인한다.

# 정식 컨테이너가 정상인 걸 확인했으면, 그제서야 nginx를 원래 대상(backend-<stage|prod>)으로 되돌린다.
ssh likelion-oci 'cp ~/nginx.conf.beforecutover ~/website/infra/nginx.conf && docker compose -f ~/website/infra/docker-compose.yml exec nginx nginx -t && docker compose -f ~/website/infra/docker-compose.yml exec nginx nginx -s reload'
ssh likelion-oci 'curl -s -o /dev/null -w "%{http_code}\n" https://api.<stage|prod>.likelion-khu.com/actuator/health'

# 마지막으로, 이번에 임시로 만든 것들을 전부 지운다(전부 원래 구조엔 없던 임시 부산물).
ssh likelion-oci 'cd ~/website/infra && docker compose -f docker-compose.yml -f docker-compose.restore.yml rm -sf backend-<stage|prod>-restore && rm -f docker-compose.restore.yml && rm -rf data-restore && rm -f ~/nginx.conf.beforecutover'
```

**이 절차가 더 번거로운 이유**: nginx 설정을 두 번(전환할 때, 되돌릴 때) 고치고 그때마다 reload해야 해서, 손이 가는 지점이 단순 복원의 2배다. 인시던트 대응 중 급한 마음에 "문제 있으면 바로 되돌리기"를 건너뛰고 바로 ⑤로 넘어가고 싶어질 수 있는데, 그러면 안 된다 — ⑤에서 옛 컨테이너를 이미 내린 뒤에 문제가 생기면 그땐 되돌릴 대상 자체가 없다. `docker-compose.restore.yml`과 `nginx.conf.beforecutover`는 이 작업이 끝나면 사라져야 할 임시 파일이라 git에 커밋하지 않는다(nginx.conf 자체도 서버에만 있고 이미 gitignore 처리돼 있다).

---

## 6. 평소 루틴 — 알람이 없어도 하는 것

알람은 "이미 문제가 기준치를 넘었다"는 걸 알려주는 신호일 뿐이다. 알람이 울리기 전에 스스로 챙기는 루틴이 없으면, 결국 알람이 울릴 때만 반응하는 사람이 되어버린다. 아래는 정해진 주기를 못 박아둔 규칙이 아니라, 1절에서 말한 마인드셋을 실제로 실천하기 위한 습관 목록이다.

- **한 달에 한 번, 비용 한도와 실제 사용량을 대조한다** — 4-6절 참고. 이건 알림이 따로 안 오는 항목이라 스스로 챙겨야 한다.
- **가끔(분기에 한 번 정도), 이 문서들이 서버의 실제 상태와 맞는지 직접 확인한다** — "문서에 이렇게 적혀 있으니 맞겠지"라고 그냥 믿지 말고, SSH로 들어가 크론·인증서·DNS·docker compose 상태를 직접 까본다. 실제로 이번에 이런 식으로 점검하다가, 오래전에 끝났는데 안 지워진 "미결 사항", 더는 안 쓰는 인증서, 문서끼리 서로 어긋나는 부분을 여러 건 찾아냈다 — 이건 우연이 아니라, **문서는 시간이 지나면 실제 상태와 어긋나기 마련**이라는 전제 위에서 정기적으로 점검해야 하는 이유다.
- **반복되는 수동 작업을 발견하면 바로 자동화할 후보로 기록해둔다** — "이번만 수동으로 하고 넘어가자"가 계속 쌓이면, 그게 그대로 다음 담당자의 몫이 된다. 다만 자동화할지 말지 정할 땐 **왜 지금까지 수동으로 남아있었는지**부터 확인할 것 — DB 접근 계정 발급처럼 일부러 사람이 직접 하도록 남겨둔 보안 경계라면 자동화 대상이 아니다.
- **프론트·백엔드가 인프라 때문에 막혔다는 신호를 놓치지 않는다** — 카톡이나 이슈 코멘트에서 "배포가 안 돼서", "DB를 못 봐서", "환경변수가 없어서" 같은 말이 반복해서 나온다면, 그건 알람은 아니지만 이 역할이 제 몫을 못 하고 있다는 신호다. 이런 신호를 발견하면 이슈로 만들어 직접 해결하거나(기술적으로 어떻게 할지는 스스로 판단), 범위가 크면 PM에게 넘긴다(우선순위는 PM이 판단).
- **다른 일을 하다가 인프라 문제를 발견해도, 하던 일과 묶지 않고 따로 이슈로 쪼갠다** — 이번 세션에서 한 것처럼 본론과 상관없는 발견이라도 그냥 넘기지 않는다. 위험도가 낮으면 스스로 판단해서 바로 고치고, 판단하기 애매하면 정리해서 다음 사람(팀 또는 PM)에게 넘긴다.

---

## 7. 백엔드·프론트와의 협업 인터페이스

`infra/CLAUDE.md`에 적혀 있듯이, 배포나 인프라 관련 조율은 PM을 거치지 않고 팀끼리 직접 한다. 아래는 그렇게 직접 조율할 때 서로 뭘 알아두고 지켜야 하는지를 정리한 것이다 — 새로 합류한 사람이 "이걸 나한테 미리 알려줬어야지"라는 상황을 안 겪도록, 미리 명시해둔다.

### 7-1. 백엔드가 알아야/지켜야 하는 것

| 항목 | 내용 |
|---|---|
| **배포가 언제 도는가** | `backend/**`·`shared/**` 변경이 있는 PR이 `dev`/`main`에 머지될 때만 CD가 자동으로 돈다. `infra/**`만 바뀐 커밋은 안 돈다(위 5절). |
| **헬스체크 엔드포인트** | `/actuator/health`가 CD 헬스체크·UptimeRobot·스모크 테스트 판단 기준이다. 이 엔드포인트의 응답 계약(200/UP, 이상 시 503/DOWN)을 바꾸면 세 군데가 동시에 영향받는다 — 바꾸기 전에 인프라와 미리 공유. |
| **스모크 테스트 대상** | CD가 배포 직후 `/api/members`·`/api/staff`·`/api/posts`·`/api/projects`(인증 없이 공개된 조회 엔드포인트만)를 실제 도메인으로 찌른다. 새로운 공개 조회 엔드포인트를 추가하고 그게 배포 검증에 포함되길 원하면 `cd.yml`에 추가 요청. |
| **스키마 변경** | Flyway 마이그레이션(`backend/src/main/resources/db/migration/V{n}__*.sql`)으로만. sqlite3 직접 `ALTER`/`CREATE`/`DROP`은 `dbclient` 계정에서 기술적으로 차단돼 있다(`db-access.md`). |
| **새 환경변수** | `.env.stage`/`.env.prod`에 실제 값을 넣는 건 인프라(서버 접근 필요) — 새 환경변수가 필요하면 이름·용도를 인프라에 알려야 서버에 반영된다. 템플릿은 `infra/.env.{stage,prod}.example`. |
| **로그** | 컨테이너 기본 로그는 재배포 시 사라진다 — 파일 로그(`logging.file.name`)로 남게 이미 구성돼 있고 배포 태그별로 분리 저장된다(`infra/logs/{stage,prod}/`, `logging.md`). |
| **DB 직접 조회** | `dbclient` 계정으로 SSH 접속(`db-access.md`) — 조회·테스트 데이터 조작은 가능, 스키마 변경은 불가. |

### 7-2. 프론트가 알아야/지켜야 하는 것

| 항목 | 내용 |
|---|---|
| **배포는 인프라 무관** | Vercel이 프론트 배포를 담당 — OCI/CD 파이프라인과 별개다. 단 Vercel 계정이 아직 박일하 개인 계정에 묶여 있다(`pm/docs/ops.md` 미결 리스크). |
| **백엔드 연결** | 브라우저는 `likelion-khu.com`으로만 요청하고, Next.js 서버사이드 rewrite가 `/api/*`를 백엔드(OCI)로 프록시한다 — CORS 설정 불필요, 백엔드 주소도 브라우저에 노출 안 됨. 환경변수 `BACKEND_URL`(서버 전용). |
| **도메인·DNS 변경** | nginx가 도메인별 라우팅(`api.prod.`·`api.stage.`)을 하드코딩하고 있어, 도메인 구조를 바꾸려면 인프라와 먼저 협의 — nginx 설정·SSL 인증서 도메인 목록에 영향. |

### 7-3. 인프라가 두 팀에 공통으로 요구하는 것

- **`infra/**`를 바꿀 땐 항상 브랜치를 만들고 PR을 올린다** — 이 레포의 정책이다(`pm/` 디렉터리만 예외로 곧바로 커밋할 수 있고, infra는 코드든 문서든 예외 없이 브랜치+PR로 간다).
- **비밀 값(시크릿)은 절대 커밋하지 않는다** — `.env.*.example` 같은 템플릿 파일만 레포에 올리고, 실제 값은 서버에 직접 넣거나 비밀번호 관리자에 둔다.
- **새로 데이터를 쓰는(POST/PUT/PATCH/DELETE) 엔드포인트를 추가할 때는**, 로그인·권한 확인이 "이 경로는 허용"이라는 목록 방식이 아니라 "이 HTTP 메서드는 이런 권한이 필요하다"는 기준으로 걸려 있는지 확인할 것 — 경로를 하나하나 나열하는 방식은 새 엔드포인트가 추가될 때마다 그 목록에 빠뜨려서 구멍이 생겼던 전례가 있다(자세한 내용은 learnings 참고). 이건 인프라가 직접 담당하는 영역은 아니지만, 배포 파이프라인이 이 보안 장치를 우회하지 않는다는 전제 위에서 돌아가기 때문에 여기서도 짚어둔다.

---

## 8. 인수인계 — 다음 담당자에게 넘겨야 하는 계정

`pm/docs/handoff.md`에 "인수인계 시 인프라가 해야 할 일" 체크리스트가 이미 있다 — 여기는 그 체크리스트의 각 항목이 **구체적으로 어떤 계정을 가리키고, 어디에 있고, 어떻게 넘기는지**를 담는다. 체크리스트를 여기 복붙하지 않고 서로 참조한다(중복하면 한쪽만 고치고 잊는 사고가 난다, 9절 규칙과 동일한 이유).

### 왜 "계정 목록"이 따로 필요한가

알람이 울려도 받는 사람이 없으면 의미가 없다. 정리하다 보니 다시 확인된 것: **OCI Monitoring 알람 4종과 UptimeRobot 알림은 결국 전부 이메일 구독 하나로 수렴한다.** 그래서 "계정을 넘긴다"의 상당 부분은 실은 "이 이메일 구독·수신 목록에 다음 담당자를 넣고, 필요 없어진 사람을 뺀다"는 뜻이다. 콘솔 로그인 권한만 넘기고 이 구독 목록을 안 바꾸면, 다음 담당자는 콘솔엔 들어갈 수 있어도 정작 알람이 왔을 때 아무것도 모른 채 지나간다 — 반대로 구독만 바꾸고 콘솔 권한을 안 주면 알람은 받아도 대응을 못 한다. 둘 다 챙겨야 인수인계가 완결된다.

### 계정 인벤토리

| 계정/자격증명 | 지금 어디 묶여 있나 | 어디 쓰나 | 인수인계 방법 |
|---|---|---|---|
| OCI 콘솔 (Administrators 그룹) | 장찬욱·김우진 개인 Oracle Cloud 계정(둘 다 Administrators) | 콘솔 전체(Monitoring·Alarm·IAM·Compute·Storage·Email Delivery), CLI(`~/.oci/config` + API key) | 후임자 **본인 명의로 신규 IAM 사용자 발급** → Administrators 그룹 추가 → 본인이 API 서명키 발급해 로컬 CLI 세팅 — 구체적 절차는 [`infra/CLAUDE.md`](./CLAUDE.md#oci-iam-구조-2026-07-27-실측) "새 인프라 담당자용 IAM 사용자 만들기" 참고. 기존 계정의 로그인 자격증명을 그대로 넘기지 않는다 — 사람이 바뀌면 계정도 새로 만든다. **콘솔/CLI 접근과 서버 SSH(`ubuntu`, 아래 항목)는 완전히 별개의 자격증명**이라 둘 다 따로 세팅해야 한다. |
| 서버 SSH `ubuntu` (sudo) | 장찬욱 로컬 `~/.ssh/oci_server.pem` 하나뿐 | 서버 전체 관리(docker compose·로그·수동 배포 등) | 후임자가 로컬에서 새 키페어 생성 → 공개키를 서버 `authorized_keys`(ubuntu)에 추가 → 접속 확인 후에만 장찬욱 키 제거. **개인키 파일 자체를 복사해서 넘기지 않는다** — `db-access.md`의 "키페어는 본인 소유"와 같은 원칙. |
| OCI Notifications(ONS) 구독 — 토픽 `likelion-ops-alerts` | **의도적으로 개인 메일 기반** — 현재 장찬욱·김우진 개인 메일이 구독 중. 동아리 공용 Outlook 계정으로 통합을 시도했으나, 구독 확인 메일은 왔는데 실제 알람 메일은 정크함에도 없이 안 왔다(2026-07-27 실측, 원인 미상) — 그래서 포기하고 개인 메일 기반을 유지 중(`pm/docs/learnings.md` "인프라·CI/CD" 참고) | 디스크 80%↑·메모리 85%↑·백업 26h 부재(prod·stage)·git 드리프트 **5개 알람 전부**의 **유일한 도달 경로**(전부 이메일로만 옴) — 이 5개가 전부 **같은 토픽 하나**로만 발행되는 걸 `oci monitoring alarm get`의 `destinations` 필드로 실측 확인(2026-07-27). 그래서 **메일 하나를 이 토픽에 구독시키면 5개 알람 전부를 커버한다** — 알람별로 따로 등록할 필요 없음 | 콘솔 `Notifications → Topics → likelion-ops-alerts`에서 후임자 **개인 메일 하나**를 구독 추가(PENDING → 메일함에서 확인 클릭 → ACTIVE) — 이걸로 5개 알람 전부 끝, 추가 등록 없음. **확인 클릭만으론 검증이 안 된다** — 반드시 알람 하나를 실제로 발동시켜(4-2절 임계치 조정 방식) 최종 수신까지 확인한 뒤에만 이전 담당자 메일을 구독 해지한다. |
| UptimeRobot | 동아리 공식 메일로 가입(개인 계정 아님) | 외부 가동 감시(DOWN/UP), Alert Contact = 동아리 메일 + Discord 웹훅 | 이미 개인 종속 없음 — 동아리 메일 계정 로그인 정보만 전달하면 끝. Alert Contact도 동아리 메일 그대로라 별도 변경 불필요. |
| GitHub Secrets(`OCI_HOST`·`OCI_USER`·`OCI_SSH_KEY`·`OCI_DEPLOY_PATH`) | 레포 Settings → Secrets, 변경엔 리포 admin 권한 필요 | CD가 서버에 SSH로 배포할 때 사용 | 위 `ubuntu` SSH 키를 교체했으면 **`OCI_SSH_KEY`도 반드시 같이 갱신**(안 하면 CD가 예전 키로 붙으려다 실패) — admin 권한 있는 사람(PM 등)이 값 교체. |
| DNS 등록업체(호스팅케이알) | 동아리 공용 계정(회장 결제, 개인 명의 아님) | 도메인 레코드(A/CNAME/TXT — SPF·DKIM·DMARC 포함) 등록·수정 | 이미 개인 종속 없음 — 공용 계정 로그인 정보만 전달하면 끝. |
| `backup-svc@likelion-khu.com` (백업 버킷 전용 IAM) | 서버 `infra/.env.backup`(레포엔 없음) | `likelion-backups` 버킷 업로드 자격증명(Customer Secret Key) | 사람 계정이 아니라 서비스 계정 — `ubuntu` SSH만 승계되면 서버 파일 그대로 자동 승계된다. 유출 의심될 때만 OCI 콘솔(Administrators 권한)에서 회전. |
| `smtp-mailer` (이메일 발송 전용 IAM) | 서버 `.env.stage`/`.env.prod`(레포엔 없음) | 발송 SMTP 인증(prod/stage 자격증명 분리) | 위와 동일 — `ubuntu` 승계로 자동 커버. 로테이션은 Administrators 권한 필요(유저당 자격증명 최대 2개라 이미 꽉 참, 지우고 재발급). |
| `dbclient`/`dbtunnel` 공개키 등록 권한 | 별도 계정이 아니라 `ubuntu`(서버 sudo)로 직접 등록하는 작업 | 팀원 DB 조회·조작 접근(`db-access.md`) | 별도로 넘길 게 없음 — `ubuntu` SSH가 넘어가면 이 등록 권한도 함께 넘어간다. |
| 팀 Discord 서버 멤버십 | 서버 자체(계정 아님) | UptimeRobot DOWN/UP 알림이 이 서버 채널에 웹훅으로 옴(`uptime-monitoring.md`) — 이메일과 별개의, 더 빠른(초 단위) 알림 채널 | 후임자를 서버에 초대. 웹훅이 이미 채널에 연결돼 있어 참여만 하면 바로 알림을 받는다 — 별도 설정 불필요. |

### 순서 — 실제로 인수인계할 때

1. 후임자 OCI 계정 발급 + Administrators 추가(다른 모든 작업의 전제).
2. 후임자 SSH 키를 `ubuntu`에 추가 → 정상 접속 확인 → **그 다음에만** 장찬욱 키 제거(먼저 지우면 그 사이 아무도 서버에 못 들어가는 공백이 생긴다).
3. ONS 토픽 `likelion-ops-alerts`에 후임자 **개인 메일 하나**만 구독 추가(+ 본인 확인 클릭) — 디스크·메모리·백업부재(prod·stage)·git드리프트 5개 알람이 전부 이 토픽 하나로만 발행되므로 이 메일 하나로 5개 다 커버된다(알람별로 따로 등록할 필요 없음). ①②와 순서 무관, 오히려 일찍 해둘수록 인수인계 기간 동안 후임자도 실제 알람을 같이 받아보며 감을 잡을 수 있다. **확인 클릭 후에도 끝난 게 아니다** — 알람을 한 번 실제로 발동시켜(4-2절 방식) 최종 수신까지 검증해야 한다(동아리 공용 Outlook 계정은 확인 메일만 오고 실제 알람은 안 왔던 사례가 있음, 위 표 참고).
4. 후임자를 팀 Discord 서버에 초대 — UptimeRobot 웹훅은 서버 참여만으로 바로 수신되니 ①~③과 순서 무관, 이것도 일찍 해둘수록 좋다.
5. GitHub Secrets 갱신(SSH 키를 교체했다면 `OCI_SSH_KEY`는 필수).
6. UptimeRobot·DNS 등록업체는 이미 공용 계정이라 로그인 정보만 전달.
7. 위 전부 확인된 뒤에만 장찬욱 개인 계정·키를 제거한다.

---

## 9. 갱신 규칙

- **인프라 구성이 바뀌면(새 알람, 새 서비스, 배포 절차 변경 등) 그 변경을 담은 PR 안에서 이 문서도 함께 갱신한다** — "나중에 따로 문서화하자"고 미루지 않는다. 그래야 다음에 이 문서를 읽는 사람이 실제 상태와 다른 내용을 보게 되는 일이 없다.
- **새 알람이 생기면 4절과 같은 형식으로 추가한다** — "무슨 뜻인가" 한 줄 → 복사해서 바로 실행할 수 있는 코드블록 → "그다음엔" 한 단락. 그리고 커밋하기 전에 실제로 한 번 실행해서 결과를 확인한다.
- **1절(마인드셋)과 2절(지표)은 다른 절보다 천천히 바뀌어야 하는 부분이다** — 알람에 대응하는 구체적인 명령은 상황이 바뀌면 자주 고쳐도 괜찮지만, "이 일을 왜 하는가"라는 근본 목적이 자주 바뀐다면 그건 이 문서의 문제가 아니라 팀의 방향 자체가 흔들리고 있다는 신호다. 그래도 바뀌어야 한다면, 왜 바뀌었는지를 반드시 남긴다.
- **실제로 겪은 사고나 함정은 이 문서가 아니라 `pm/docs/learnings.md`에 남긴다** — 이 문서(RUNBOOK)는 "지금 이 순간 뭘 해야 하는지"만 담고, "왜 그렇게 됐는지"에 대한 경위는 learnings와 각 주제별 문서(`observability.md` 등)가 담당한다. 같은 내용을 여러 곳에 중복해서 적으면, 나중에 한쪽만 고치고 다른 쪽을 놓쳐서 문서끼리 어긋나는 일이 생긴다.
