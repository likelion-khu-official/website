# 인프라 운영 러너북 — 알람 대응 · 자주 쓰는 명령

> 오너: 장찬욱(@cjang3285). **살아있는 문서** — infra를 바꾸면 같은 PR에서 이 문서도 같이 갱신한다(아래 "갱신 규칙" 참고).
>
> 이 문서는 **운영자가 문제를 맞닥뜨렸을 때(또는 뭔가 실행해야 할 때) 뭘 하면 되는지**만 담는다 — 알람별 대응 절차와 자주 쓰는 명령 두 가지뿐이다. 이 역할의 목적·지표·필요 역량·평소 루틴·백엔드/프론트 협업 인터페이스, 인수인계 체크리스트·계정 인벤토리는 전부 [`handoff.md`](./handoff.md)에 있다(2026-07-27 정리 — 예전엔 이 문서에 다 섞여 있었는데, "문제 대응"과 "역할 오리엔테이션·인수인계"가 목적이 달라서 분리했다).

## 관련 문서

| 문서 | 뭘 담고 있나 |
|---|---|
| [`handoff.md`](./handoff.md) | 이 역할의 마인드셋·지표·필요 역량·평소 루틴·협업 인터페이스, 인수인계 체크리스트 + 계정 인벤토리 — "이 역할이 뭐고 어떻게 하는가"는 여기 |
| [`observability.md`](./observability.md) | 디스크·메모리·백업 알람의 설계 경위·메트릭 조회 함수의 이해 |
| [`uptime-monitoring.md`](./uptime-monitoring.md) | UptimeRobot 설계 경위·한계 |
| [`db-access.md`](./db-access.md) | DB 접속·Flyway 경계·백업 전략 |
| [`infra/.claude/skills/db-access/SKILL.md`](../.claude/skills/db-access/SKILL.md) | 팀원의 DB 관련 질문(접속법·SQL 허용여부·GUI·공개키 등록)에 Claude Code가 `db-access.md` 기반으로 즉답하게 하는 스킬 |
| [`backend/.claude/skills/db-man/SKILL.md`](../../backend/.claude/skills/db-man/SKILL.md) | 위치는 `backend/`(엔티티 변경 시 자동 트리거되게 스코프)지만 장찬욱(인프라)이 Flyway 도입(#133) 때 같이 만들고 관리하는 스킬 — 엔티티 변경 시 마이그레이션 파일을 빠뜨리지 않게 함 |
| [`logging.md`](./logging.md) | 로그 구조 |
| [`CI-CD.md`](./CI-CD.md) | CI/CD 절차 설명 |
| `pm/docs/learnings.md` "인프라 · CI/CD" 절 | 실제 사고 히스토리 — 같은 함정을 반복하지 않기 위한 원본 |

---

<a id="alarm-response"></a>
## 1. 알람 대응 절차 (Runbook)

원칙: **알람이 오면 그 메일 본문에 "왜 울렸는지"가 항상 적혀 있다.** OCI가 보내는 알람 4개는 모두 `ONS_OPTIMIZED`라는 형식으로 오는데, 쉽게 말해 어떤 지표가 어떤 값을 넘어서 울렸는지 사람이 읽기 좋게 정리된 형식이라는 뜻이다. UptimeRobot 알람은 어떤 URL이 접속 안 되는지를 명시해서 보내준다.

```
┌──────────────────────────────────────────────────────────┐
│  서버(likelion-oci) — push-*.py 스크립트 (cron 5분 / 백업 성공 시)│
└───────────────────────────┬──────────────────────────────┘
                            │ custom metric
                            ▼
┌──────────────────────────────────────────────────────────┐
│  OCI Monitoring — Alarm Definitions × 5                    │
│  디스크80% · 메모리85% · 백업부재(prod/stage) · git드리프트   │
└───────────────────────────┬──────────────────────────────┘
                            │ FIRING
                            ▼
┌──────────────────────────────────────────────────────────┐
│  ONS Topic: likelion-ops-alerts                             │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
                    이메일 (장찬욱 · 김우진)

  ※ UptimeRobot(외부 가동 감시)은 이 파이프라인과 별개 — 동아리 메일 +
    Discord 웹훅으로 직접 옴(uptime-monitoring.md)

                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  운영자 — 아래 1-1~1-5절                                    │
│   경고(왜 왔나) → 영향(지금 뭐가 안 되나) → 원인 후보 → 복구    │
└──────────────────────────────────────────────────────────┘
```

아래는 **이 일을 처음 하는 사람도 그대로 복사해서 자기 로컬 터미널에 붙여넣기만 하면 되도록** 알람 항목마다 실행할 명령을 한 블록으로 묶어뒀다. 필요한 사전 준비는 SSH 접속 설정(`~/.ssh/config`, 키 파일)뿐이고, 이건 `handoff.md`의 역량 표에 안내돼 있다.

**각 알람은 경고(왜 울렸나) → 영향(지금 뭐가 실제로 안 되고 있나) → 원인 후보(자주 나오는 원인) → 복구(뭘 하면 되나) 순서로 정리돼 있다**(2026-07-27 김우진 리뷰로 추가 — 알람을 받고도 "이게 지금 진짜 급한 건가, 뭐부터 의심해야 하나"를 매번 처음부터 판단해야 하는 게 문제였다). 제목 옆 **대응 긴급도**는 OCI가 매긴 심각도(현재 4개 알람 전부 `CRITICAL`로 동일)와는 별개로, 지금 실제로 서비스에 영향이 가고 있는지를 기준으로 우리가 따로 판단해 붙인 것이다 — **예방적 경고**는 아직 서비스는 멀쩡하고 미리 손볼 여유가 있는 알람, **즉시 대응**은 이미 사용자 쪽에 영향이 가고 있는 알람이다.

> 아래 명령은 전부 2026-07-26에 실제 서버(`ssh likelion-oci`)에 접속해서 하나씩 직접 실행해보고 결과까지 확인한 것들이다(디스크 정리·메모리 재기동·백업 재실행까지 실제로 돌려서 성공을 확인했다) — "이론상 맞을 것 같은 명령"이 아니라 "실제로 돌려본 명령"이라는 뜻이다. 다음에 이 문서에 명령을 추가하거나 고칠 때도 이 원칙을 지킬 것: **명령을 추가·수정하면 실제로 한 번 실행해서 결과를 확인한 뒤에 커밋한다.**

<a id="alarm-disk-80"></a>
### 1-1. OCI Monitoring — 디스크 사용률 80% 초과 (OCI 심각도: CRITICAL / 대응 긴급도: 예방적 경고)

**경고**: 서버의 루트 디스크(`/`) 사용률이 5분 넘게 80%를 넘었다는 뜻이다. 이 서버는 무료 티어 한도가 부트 볼륨+블록 볼륨 합쳐서 200GB인데, 여기서 잡는 기준(80%)은 그보다 훨씬 낮은 수치라 아직 여유가 있을 때 미리 알려주는 조기 경보다.

**영향**: 지금 이 순간 서비스가 느려지거나 멈추지는 않는다 — 아직 미리 손볼 여유가 있는 단계에서 잡도록 설계된 알람이다. 방치해서 디스크가 실제로 꽉 차면 그때부터 로그 기록 실패 → DB(SQLite) 쓰기 실패 → 배포 시 새 이미지 pull 실패로 배포 자체가 막히는 순서로 번진다.

**원인 후보**: 가장 흔한 건 배포 때마다 서버에 쌓이는 오래된 도커 이미지·컨테이너. 그다음으로 `infra/logs/`에 쌓인 로그 파일(30일 넘은 건 자동 정리되지만, 그새 급증했을 수 있음). 드물게는 백업 관련 임시 파일이나 DB 파일 자체의 증가.

```bash
ssh likelion-oci 'df -h / && echo --- && docker system df && echo --- && du -sh /home/ubuntu/website/infra/logs/* /home/ubuntu/backups 2>/dev/null'

ssh likelion-oci 'docker image prune -f'
# ↑ 태그 없는(dangling) 이미지만 지운다 — 절대 -a를 쓰지 말 것. -a는 실행 중이지 않은
#   모든 이미지를 지우는데, 여기엔 "수동 롤백"(2절)에 필요한 이전 버전 태그 이미지도
#   포함된다. 이 실수를 실제로 할 뻔했다가 시스템이 막아서 알게 됨(2026-07-26).

ssh likelion-oci 'df -h /'   # 정리 후 재확인
```

**복구**: `infra/logs/{stage,prod}/`에 쌓인 로그 중 30일 넘은 건 `cleanup-old-logs.sh`가 매일 자동으로 지워준다(2026-07-26에 추가함). 그런데도 디스크 사용률이 안 줄면, 원인이 로그가 아니라 다른 것(도커 이미지나 볼륨 등)이라는 뜻이니 위에서 확인한 `docker system df` 결과부터 다시 살펴볼 것. 며칠 안에 다시 재발하거나 200GB에 점점 가까워지는 추세라면 김우진에게 공유한다 — 블록 볼륨을 늘리려면 그게 무료 한도(200GB) 안에 들어오는지부터 먼저 확인해야 한다.

<a id="alarm-memory-85"></a>
### 1-2. OCI Monitoring — 메모리 사용률 85% 초과 (OCI 심각도: CRITICAL / 대응 긴급도: 예방적 경고 — 단, 1-1보다 여유가 적음)

**경고**: 메모리 사용률이 5분 넘게 85%를 넘었다는 뜻이다. 이 서버는 CPU 2코어·메모리 12GB로 고정돼 있고(무료 티어 한도라 늘릴 수 없음) 스왑 메모리도 없어서, 메모리가 다 차면 바로 문제가 생긴다.

**영향**: 알람이 온 시점엔 아직 서비스가 응답하고 있는 상태다 — 하지만 스왑이 없어서 디스크(1-1)보다 여유 구간이 짧다: 방치해서 실제로 메모리가 꽉 차면 OOM(메모리 부족으로 프로세스 강제 종료)이 나면서 백엔드 컨테이너가 죽고, 그러면 곧바로 1-5(UptimeRobot DOWN)로 이어진다 — 즉 이 알람을 방치하면 다음 단계는 "즉시 대응" 등급의 실제 장애다.

**원인 후보**: 일시적인 요청 스파이크(자연 해소될 수 있음), 메모리 누수(같은 알람이 반복되면 의심), stage·prod 두 백엔드가 같은 인스턴스에서 동시에 부하를 받는 경우.

```bash
ssh likelion-oci 'free -m && echo --- && docker stats --no-stream'

ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml restart backend-stage'
# ↑ 위 docker stats에서 메모리를 크게 물고 있던 서비스로 바꿔서 실행 (backend-prod 등)

sleep 30   # Spring Boot 기동에 20~30초 걸린다 — 재기동 직후 바로 확인하면 000(연결 실패)이 뜬다(실측 확인)
ssh likelion-oci 'curl -s -o /dev/null -w "재기동 후:%{http_code}\n" http://localhost:8081/actuator/health && free -m'
```

**복구**: 이 알람이 반복해서 온다면 재기동으로 넘어갈 게 아니라 근본 원인(메모리 누수 등)을 의심하고 신선우·안시현에게 공유한다(협업 인터페이스는 `handoff.md` 참고). 서버 자체를 재부팅하는 건 최후의 수단으로만 — 재부팅 자체는 안전하다고 실제로 확인했지만, 원인을 알아낼 단서(로그 등)가 같이 날아간다. 스펙을 올리는 것(4 OCPU/24GB로)은 **무료 티어를 벗어나는 일**이라 김우진의 결정이 필요하다.

<a id="alarm-backup-prod"></a><a id="alarm-backup-stage"></a>
### 1-3. OCI Monitoring — DB 백업 26시간 이상 부재 (prod/stage, OCI 심각도: CRITICAL / 대응 긴급도: 예방적 경고 — 단, 방치 시간에 비례해 손실 위험이 누적됨)

**경고**: 이 알람은 백업이 실패했다는 걸 직접 감지하는 게 아니라, "마지막으로 백업 성공 신호가 온 지 26시간이 지났다"는 것만 본다(이런 방식을 **dead man's switch**라고 부른다 — 정상이면 계속 살아있다는 신호를 보내야 하고, 그 신호가 끊기면 무슨 이유에서든 문제가 생겼다고 간주하는 방식). 그래서 이 알람이 울렸다는 건 "백업 내용이 이상하다"가 아니라 "백업이 됐다는 신호 자체가 안 왔다"는 뜻이다 — 원인은 지금부터 찾아야 한다.

**영향**: 지금 당장 서비스(prod/stage 자체)는 멀쩡하게 동작 중일 수 있다 — 이 알람만으로는 서비스 장애가 아니다. 다만 "최근 백업이 없는 채로" 시간이 흐르는 동안 만약 DB에 문제가 생기면(실수로 데이터가 잘못 들어갔거나 마이그레이션이 망가뜨렸거나) 되돌릴 수 있는 시점이 그만큼 옛날로 밀린다 — 즉 지금 당장의 장애가 아니라 **손실 위험이 방치 시간만큼 계속 쌓이는** 성격의 알람이라, 조기 경보 중에서도 우선순위를 높게 둘 것.

**원인 후보**: cron 자체가 안 돎(권한·환경변수 문제), 스크립트 실행 권한이 벗겨짐(아래 "복구" 참고), 스크립트 내부 에러(과거 실제 사례: CRLF 줄바꿈으로 셔뱅이 깨짐 — `observability.md`의 "발견된 실제 장애" 참고), 버킷 접근 권한 만료.

```bash
ssh likelion-oci 'tail -20 ~/backup.log && echo --- && crontab -l | grep backup-db && echo --- && git -C ~/website ls-tree HEAD -- infra/scripts/backup-db.sh'
# ↑ 마지막 줄이 100755가 아니면(예: 100644) 실행권한이 벗겨진 것 — 아래 "다음" 참고

ssh likelion-oci 'cd ~/website/infra/scripts && bash backup-db.sh && echo --- && tail -5 ~/backup.log'
# ↑ 수동 1회 실행 — prod·stage 업로드 + 메트릭 전송까지 성공하면 다음 평가 주기에 알람이 OK로 전환된다
```

**복구**: 위 `git ls-tree` 결과가 `100644`(실행 권한 없음)로 나왔다면, 서버에는 예전에 걸어둔 `chmod +x`(실행 권한 부여)만 남아있고 정작 git에는 그 실행 권한이 기록돼 있지 않은 상태다. 이럴 땐 `git -C ~/website update-index --chmod=+x infra/scripts/backup-db.sh`를 실행해 git에도 실행 권한을 기록한 뒤 커밋하고, **`dev`·`main` 두 브랜치 모두에** 머지해야 한다(한쪽만 하면 나중에 다른 쪽을 배포할 때 그 배포가 다시 덮어써 버린다). 자주 나오는 다른 원인은 줄바꿈 문자(CRLF)가 섞여서 스크립트 맨 앞의 실행 방식 지정(셔뱅)이 깨지는 경우인데, 이건 `.gitattributes` 설정으로 이미 막아뒀으니 혹시 모르니 재확인만 한다. 이 두 가지 다 아니라면(버킷 접근 권한이 만료됐다든지) 근본적인 수정이 필요한 PR을 올려야 한다 — 그 사이엔 급한 대로 하루 더 수동으로 백업을 돌리면서 원인을 조사한다.

<a id="alarm-git-drift"></a>
### 1-4. OCI Monitoring — 배포서버 git 드리프트 감지 (OCI 심각도: CRITICAL / 대응 긴급도: 예방적 경고 — 다음 배포 전까지 시간 여유)

**경고**: 서버에 있는 git 저장소에, git이 아직 추적하지 않는(커밋되지 않은) 변경이 생겼다는 뜻이다.

**영향**: 지금 이 순간 서비스가 죽는 건 아니다. 하지만 이 상태로 다음 배포를 시도하면 `git pull`이 충돌하거나 실패해서 배포 자체가 막히거나, 배포 과정에서 이 변경이 조용히 덮어써질 수 있다 — **"다음 배포가 실패할 시한폭탄"**에 가까운 성격이라, 알람이 온 시점보다 "다음 배포 전에 정리했는가"가 진짜 마감이다.

**원인 후보**: 누군가 SSH로 서버에 들어가 파일을 직접 고쳤거나, 새로 생긴 데이터·로그 폴더를 `.gitignore`에 안 넣었거나, 아직 머지 안 된 브랜치를 서버에서 먼저 테스트해봤을 때 주로 생긴다.

```bash
ssh likelion-oci 'git -C ~/website status --porcelain'

ssh likelion-oci 'git -C ~/website diff'
# ↑ 이미 git이 추적 중이던 파일이 수정된 경우, 뭐가 바뀌었는지 실제 내용을 봐야 "정말 필요한 변경인지, 실수로 고친 건지" 판단할 수 있다.

ssh likelion-oci "git -C ~/website status --porcelain | awk '\$1==\"??\"{print \$2}' | xargs -r -I{} sh -c 'echo ---{}---; cat ~/website/{} 2>/dev/null | head -20'"
# ↑ 위 status에서 ?? 표시(추적 안 되는 새 파일)가 있으면, 이 명령으로 그 파일들 내용을 앞부분만 미리 본다.
```

**복구**: 위에서 나온 파일이 **서버에만 있으면 되는, 원래 의도된 파일**(새로 생긴 로그·데이터 폴더 등)이라면, 로컬에서 `.gitignore`에 추가하고 커밋·푸시한다 — 이러면 근본적으로 고쳐지는 거라 이 알람 자체가 다시는 안 뜬다. 반대로 **누군가 실수로 고친 흔적**이라면, 그 변경이 정말 필요한 건지 판단해서 커밋하거나, `ssh likelion-oci 'git -C ~/website checkout -- <path>'`로 원래대로 되돌린다. **어느 쪽이든 다음 배포 전에 반드시 정리해야 한다** — 안 그러면 배포가 실패하거나, 배포 과정에서 이 변경이 덮어써져서 방금 한 판단 자체가 무의미해진다. (참고로 이 알람은 아직 커밋 안 된 변경만 감지한다 — 이미 커밋은 됐는데 원격 저장소(origin)와 내용이 갈라진 경우는 이 알람으로는 못 잡는다는 빈틈이 있다. 자세한 건 `observability.md` 참고.)

<a id="alarm-uptime-down"></a>
### 1-5. UptimeRobot — DOWN (api.prod / api.stage / likelion-khu.com / dev.likelion-khu.com) — 대응 긴급도: 즉시 대응

**경고**: 외부에서 사이트나 API에 접속이 안 된다는 뜻이다. 서버에 SSH로 들어가지 않고도 아래 명령으로 먼저 상태를 확인할 수 있다:

```bash
curl -s -o /dev/null -w 'prod:%{http_code}\n'  https://api.prod.likelion-khu.com/actuator/health
curl -s -o /dev/null -w 'stage:%{http_code}\n' https://api.stage.likelion-khu.com/actuator/health
curl -s -o /dev/null -w 'front-prod:%{http_code}\n' https://likelion-khu.com
curl -s -o /dev/null -w 'front-dev:%{http_code}\n'  https://dev.likelion-khu.com
```

**영향**: 이 문서에 나오는 알람 중 유일하게 "이미 사용자가 실제로 접속 못 하고 있는" 상태다 — 1-1~1-4는 전부 방치하면 언젠가 문제가 되는 조기 경보지만, 이건 지금 이 순간 영향이 발생 중이라는 점에서 다르다. 그래서 5개 알람 중 가장 먼저 확인해야 한다.

**원인 후보 — 어떻게 판단하나**: **prod와 stage 백엔드가 동시에** DOWN이면 인스턴스 자체에 문제가 생겼을 가능성이 크다(둘 다 같은 OCI 인스턴스에서 돈다). **하나만** DOWN이면 그 서비스만의 개별 문제다. **프론트 두 개만** DOWN이면 인프라(OCI)와는 무관한 Vercel 쪽 문제다(`handoff.md`의 협업 인터페이스 참고). 백엔드 개별 문제일 땐 최근 배포가 원인인 경우가 많다 — 크래시 루프라면 거의 항상 직전 배포가 의심 대상이니, 원인을 좁히기 전에 **먼저 최근 배포 이력부터 확인**한다(`ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml ps'`로 뜬 이미지 태그와, GitHub Actions `cd.yml` 실행 히스토리의 최근 배포 시각을 대조).

백엔드가 DOWN이면 서버로 들어가 원인을 확인한다:

```bash
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml ps'
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml logs --tail=100 backend-prod'
# ↑ 대상 서비스로 바꿔서(backend-stage 등). ssh 자체가 안 되면 인스턴스 문제 — OCI 콘솔에서 인스턴스 상태부터 확인
```

**복구**: 컨테이너가 뜨자마자 계속 죽었다 살아나기를 반복하는 상태(크래시 루프)라면, 로그에서 원인을 확인한 뒤 재기동한다([1-2절](#alarm-memory-85) 재기동 명령을 그대로 쓰면 된다). 최근에 배포한 게 원인으로 의심되면 2절 "수동 롤백"을 참고한다. **5분짜리 확인 틈새를 주의할 것**: UptimeRobot 무료 플랜은 5분에 한 번씩만 확인하기 때문에, 5분보다 짧게 끝난 장애(잠깐의 재부팅 등)는 알림이 아예 안 올 수도 있다(실측 근거는 `uptime-monitoring.md`). 그러니 "알림이 안 왔으니 문제가 없었다"고 넘겨짚으면 안 된다.

---

<a id="cheat-sheet"></a>
## 2. 자주 쓰는 명령 (Cheat sheet)

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
ssh likelion-oci 'cd ~/website/infra && set -a && source .env.backup && set +a && python3 scripts/backup_upload.py list <prod|stage>'

# ② 고른 백업을 홈 디렉터리의 임시 폴더(~/restore-tmp)에 내려받고, 파일이 안 깨졌는지 검사한다 — 이 단계는 실제 서비스에 아무 영향 없다.
ssh likelion-oci 'cd ~/website/infra && set -a && source .env.backup && set +a && mkdir -p ~/restore-tmp && python3 scripts/backup_upload.py get <db>/<db>-<날짜>.db ~/restore-tmp/<db>-<날짜>.db && sqlite3 ~/restore-tmp/<db>-<날짜>.db "PRAGMA integrity_check;"'
# ↑ 결과가 "ok"인지 반드시 눈으로 확인한 뒤에만 다음 단계로 넘어간다. "ok"가 아니면 다른 날짜로 다시 시도한다.

# ③ 서비스를 멈춘다 — DB 파일을 쓰고 있는 상태에서 교체하면 안 되고, 이 순간부터 재기동 전까지는 요청이 실패한다(다운타임 발생, 아래 "고급" 절차는 이걸 없앤 버전).
ssh likelion-oci 'docker compose -f ~/website/infra/docker-compose.yml stop backend-<stage|prod>'

# ④ 만약을 대비해 지금 쓰던(교체 전) DB 파일을 이름을 바꿔 옆에 남겨두고, 그 자리에 검증된 백업 파일을 넣는다. 소유권·권한도 원래 라이브 파일과 똑같이 맞춰준다(db-access.md 참고 — root:dbaccess, 660).
ssh likelion-oci 'cp -a ~/website/infra/data/<db>.db ~/website/infra/data/<db>.db.before-restore.$(date +%F-%H%M)'
ssh likelion-oci 'cp ~/restore-tmp/<db>-<날짜>.db ~/website/infra/data/<db>.db && sudo chgrp dbaccess ~/website/infra/data/<db>.db && sudo chmod 660 ~/website/infra/data/<db>.db'

# ⑤ 서비스를 다시 켜고 정상인지 확인한다 (Spring Boot가 뜨는 데 20~30초 걸리니 바로 확인하면 아직 연결 실패로 나올 수 있다 — 1-2절과 동일한 현상).
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
ssh likelion-oci 'cd ~/website/infra && mkdir -p data-restore && set -a && source .env.backup && set +a && python3 scripts/backup_upload.py get <db>/<db>-<날짜>.db data-restore/<db>.db && sqlite3 data-restore/<db>.db "PRAGMA integrity_check;" && sudo chgrp dbaccess data-restore/<db>.db && sudo chmod 660 data-restore/<db>.db'

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

## 3. 갱신 규칙

- **인프라 구성이 바뀌면(새 알람, 새 서비스, 배포 절차 변경 등) 그 변경을 담은 PR 안에서 이 문서도 함께 갱신한다** — "나중에 따로 문서화하자"고 미루지 않는다. 그래야 다음에 이 문서를 읽는 사람이 실제 상태와 다른 내용을 보게 되는 일이 없다.
- **새 알람이 생기면 1절과 같은 형식으로 추가한다** — 제목 옆에 (OCI 심각도 / 대응 긴급도) → **경고**(왜 울렸나) → **영향**(지금 뭐가 실제로 안 되고 있나 — 예방적 경고인지 즉시 대응인지 판단 근거) → **원인 후보** → 복사해서 바로 실행할 수 있는 코드블록 → **복구**. 그리고 커밋하기 전에 실제로 한 번 실행해서 결과를 확인한다.
- **이 문서는 "지금 이 순간 뭘 해야 하는지"만 담는다** — 이 역할의 목적·지표·필요 역량·평소 루틴·협업 인터페이스·인수인계 체크리스트처럼 자주 안 바뀌어야 하는 오리엔테이션 내용은 `handoff.md`가 담당한다. 새로 추가하려는 내용이 "알람/명령에 대한 구체적 대응"이 아니라 "이 역할을 왜/어떻게 하는가, 다음 사람에게 뭘 넘기는가"에 가깝다면 이 문서가 아니라 handoff.md로 가야 한다.
- **실제로 겪은 사고나 함정은 이 문서가 아니라 `pm/docs/learnings.md`에 남긴다** — 이 문서(RUNBOOK)는 "지금 이 순간 뭘 해야 하는지"만 담고, "왜 그렇게 됐는지"에 대한 경위는 learnings와 각 주제별 문서(`observability.md` 등)가 담당한다. 같은 내용을 여러 곳에 중복해서 적으면, 나중에 한쪽만 고치고 다른 쪽을 놓쳐서 문서끼리 어긋나는 일이 생긴다.
