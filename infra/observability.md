# 리소스·백업 관측 — OCI Monitoring/Alarms/Notifications (#83)

> 인프라 문서. #83(조용한 실패를 먼저 알아채기)의 ③(디스크·메모리 사전경고)·④(백업 확신) 담당.
> ①②(외부 접속 불가·서버 전체 다운)는 [`uptime-monitoring.md`](./uptime-monitoring.md) 참고 — 이 문서와 역할이 분리돼 있음(서버 밖 vs 서버 안).

## 왜 이렇게 나눴는가

①②는 "서버가 죽어도 감지돼야" 해서 서버 밖(UptimeRobot)이 맡고, ③④는 서버가 살아있는 전제에서 "서버 자신이 스스로를 보고"하는 방식이 더 정확해서(디스크 사용률·백업 성공 여부는 서버 안에서만 정확히 알 수 있는 값) OCI Monitoring으로 갔다. "OCI 최대한 쓰자"는 방향에도 맞음 — 새 서드파티 계정 없이 이미 쓰던 OCI 안에서 전부 해결.

## 아키텍처

```
likelion-prod 인스턴스
  ├── Compute Instance Monitoring 플러그인(Oracle Cloud Agent, 이미 RUNNING)
  │     → CPU/메모리 등 기본 메트릭을 oci_computeagent 네임스페이스로 자동 전송
  │     → 디스크 사용률(%)은 여기 없음(공식 문서로 확인 — I/O 처리량만 제공, 용량%는 미제공)
  ├── ~/oci-monitor-venv (격리된 venv, oci Python SDK만 설치 — 시스템 파이썬 안 건드림)
  │     ├── push-disk-metric.py   → custom_likelion 네임스페이스로 디스크 사용률 전송 (cron */5분)
  │     └── push-backup-metric.py → 같은 네임스페이스로 백업 성공 신호 전송 (backup-db.sh가 호출)
  └── instance principal 인증 (별도 자격증명 파일 없음 — 인스턴스 자체가 identity)

OCI Monitoring
  ├── Alarm Definitions × 4개 (아래 표)
  └── 전부 같은 ONS Topic으로 발행

OCI Notifications (ONS)
  └── Topic: likelion-ops-alerts → 이메일 구독(동아리 메일 + PM 메일)
```

## IAM — instance principal

서버가 사람 자격증명 없이 자기 자신의 identity로 Monitoring API를 호출하게 하는 설정. `push-disk-metric.py`·`push-backup-metric.py` 둘 다 이걸 재사용 — 새 IAM 리소스 추가 없음.

| 리소스 | 이름 | 내용 |
|---|---|---|
| Dynamic Group | `likelion-monitoring-dyngroup` | 매칭 규칙 `ALL {instance.id = '<likelion-prod OCID>'}` — 이 인스턴스 하나만 |
| Policy | `likelion-monitoring-policy` | `Allow dynamic-group likelion-monitoring-dyngroup to use metrics in tenancy` + `Allow service monitoring to use ons-topics in tenancy`(Alarm이 ONS로 발행하는 데 필요) |

## Alarm 목록

| Alarm | 네임스페이스 | 쿼리 | 조건 | 심각도 |
|---|---|---|---|---|
| likelion-prod 디스크 공간 80% 초과 | `custom_likelion` | `DiskSpaceUtilization[5m]{resourceId="..."}.mean() > 80` | 5분 지속 시 | CRITICAL |
| likelion-prod 메모리 85% 초과 | `oci_computeagent`(네이티브) | `MemoryUtilization[5m]{resourceId="..."}.mean() > 85` | 5분 지속 시 | CRITICAL |
| likelion-prod DB 백업 26시간 이상 부재 | `custom_likelion` | `BackupSuccessProd[1h].absent(26h)` | 마지막 성공 신호로부터 26시간 경과 | CRITICAL |
| likelion-stage DB 백업 26시간 이상 부재 | `custom_likelion` | `BackupSuccessStage[1h].absent(26h)` | 마지막 성공 신호로부터 26시간 경과 | CRITICAL |

**백업 알람이 dead man's switch인 이유**: 백업 자체(`backup-db.sh`)는 2026-07-04부터 이미 매일 잘 돌고 있었음(cron+버킷 실측 확인됨, #83 조사 과정에서 재확인). 근데 "잘 되고 있다"를 사람이 매번 SSH로 들어가 확인해야 아는 상태였음 — 이 알람은 그 확인을 자동화한 것. 값 자체(`=1`)엔 의미가 없고, 신호가 26시간 동안 **안 들어오는 것** 자체가 이상 신호. cron이 안 돌았든, 서버가 죽었든, 백업 스크립트가 중간에 실패했든 원인 불문하고 다 잡힘. 26시간 = 매일 18:00 UTC 실행 주기(24h) + 2시간 버퍼.

**디스크 사용률이 custom metric인 이유**: OCI의 Compute Instance Monitoring 플러그인은 CPU/메모리/디스크 I/O(바이트·IOPS)는 기본 제공하지만 "디스크가 몇 % 찼는가"는 제공하지 않음(공식 문서로 확인 — 하이퍼바이저/블록스토리지 레벨에선 파일시스템 내부를 모름, OS 안에서만 알 수 있는 정보). 그래서 서버 위 스크립트가 직접 `df` 값을 계산해서 채워 넣음.

## 파일

| 파일 | 역할 |
|---|---|
| `infra/push-disk-metric.py` | 디스크 사용률(%) → custom metric. cron `*/5 * * * *`로 실행 |
| `infra/push-backup-metric.py` | 백업 성공 신호 → custom metric. `backup-db.sh`가 각 DB 백업 성공 직후 호출 |
| `infra/backup-db.sh` | 기존 백업 스크립트 + 성공 시 `push-backup-metric.py` 호출 한 줄 추가됨 |

서버의 `~/oci-monitor-venv`(venv, oci SDK만 설치)는 레포에 없음 — 최초 세팅 시 아래로 재현:
```bash
python3 -m venv ~/oci-monitor-venv
~/oci-monitor-venv/bin/pip install oci
```
(Ubuntu 24.04는 `python3.12-venv` 패키지가 먼저 필요할 수 있음 — `sudo apt-get install -y python3.12-venv`)

## 알림 — 어디로 오고 무엇을 근거로 판단하나

- **어디로**: ONS Topic `likelion-ops-alerts` 구독자(동아리 메일, PM 메일)
- **판단 근거**: 메일 제목/본문에 어떤 Alarm이 왜 울렸는지 그대로 담겨 있음(위 표의 body 텍스트). 디스크/메모리는 "지금 값이 임계치를 넘었다", 백업은 "마지막 성공 신호로부터 26시간 지났다"
- **확인 방법**: OCI 콘솔 `Observability & Management → Monitoring → Alarm Definitions`(컴파트먼트는 루트, 리전은 `ap-tokyo-1`로 맞출 것 — 안 그러면 안 보임, 실제로 헷갈렸던 지점)

## 실측 검증 (2026-07-08)

- 디스크 메트릭: 배포 직후 실제 값(15.55%) 전송·조회 확인
- 백업 메트릭: `push-backup-metric.py prod`/`stage` 수동 실행 → 즉시 조회 확인
- 재부팅 복구력 점검 중 **prod 컨테이너의 실제 재시작 정책이 compose 파일 선언(`unless-stopped`)과 다르게 `on-failure`로 드리프트돼 있던 것을 발견·수정**(재부팅해도 자동 복구 안 되는 상태였음) — 상세 경위는 `pm/docs/learnings.md` 참고
- 이 수정 과정에서 태그 미지정 재생성으로 실제 prod 장애(약 2~3분, `exec format error`)가 발생했었음 — 원인·복구는 같은 learnings 항목에 기록

## 실발동 검증 (2026-07-09)

3개 미결 항목을 실제로 발동시켜 검증 완료 — 셋 다 정상 동작 확인, PR 머지·이슈 클로즈 전 마지막 단계.

- **재부팅 복구력**: 인스턴스 실제 재부팅 → 20초 만에 nginx·backend-stage·backend-prod 전부 기존 이미지 태그 그대로 자동 재기동, 헬스체크 전부 200 정상 복귀.
- **디스크/메모리 Alarm**: 임계치를 임시로 낮춰(디스크 80→10, 메모리 85→5) FIRING 전환 + ONS 이메일 수신 확인 후 원래 임계치로 복원.
- **백업 Absence Alarm**: 검증하려고 보니 **이미 2026-07-08 06:30 UTC부터 계속 FIRING 중이었음** — 합성 테스트가 필요 없을 정도로 이미 실전에서 발동해 있던 것. 원인은 아래 "발견된 실제 장애" 참고. 근본 원인 수정 + 수동 백업 1회 실행으로 OK 전환까지 확인(FIRING→OK 실측 완료, 07-09 03:37 UTC).

### 증빙 로그 (2026-07-09 실측)

**① 재부팅 복구력**

재부팅 전 baseline — 3개 컨테이너 전부 `unless-stopped`, 헬스체크 정상:
```
$ docker inspect infra-nginx-1 infra-backend-stage-1 infra-backend-prod-1 --format '{{.Name}}: {{.HostConfig.RestartPolicy.Name}}'
/infra-nginx-1: unless-stopped
/infra-backend-stage-1: unless-stopped
/infra-backend-prod-1: unless-stopped

$ curl -s -o /dev/null -w 'prod:%{http_code}\n' http://localhost:8080/actuator/health
prod:200
$ curl -s -o /dev/null -w 'stage:%{http_code}\n' http://localhost:8081/actuator/health
stage:200
```

`sudo reboot` 실행 → SSH 재접속까지 폴링:
```
SSH back up after ~20s (attempt 2)
```

재부팅 사실 자체를 `uptime -s`로 확인(부팅 시각이 방금으로 찍힘) + 컨테이너 전부 기존 이미지 태그 그대로 자동 재기동:
```
$ uptime -s; uptime
2026-07-09 03:23:29
 03:23:59 up 0 min,  1 user,  load average: 4.80, 1.16, 0.39

$ docker compose -f ~/website/infra/docker-compose.yml ps
NAME                    IMAGE                                                          SERVICE         STATUS
infra-backend-prod-1    ...backend:prod-dd896d94d34eae15330a563a3fc5283e897b79ae        backend-prod    Up 20 seconds
infra-backend-stage-1   ...backend:stage-bd361cdf997136a3767ff688449d180a50b2a693       backend-stage   Up 20 seconds
infra-nginx-1           nginx:alpine                                                    nginx           Up 20 seconds
```

재부팅 후 헬스체크(서버 내부 + 외부 도메인) 전부 정상 복귀:
```
$ curl -s -o /dev/null -w 'prod:%{http_code}\n' http://localhost:8080/actuator/health && curl -s -o /dev/null -w 'stage:%{http_code}\n' http://localhost:8081/actuator/health
prod:200
stage:200

$ curl -s -o /dev/null -w '%{http_code}\n' https://api.prod.likelion-khu.com/actuator/health
200
$ curl -s -o /dev/null -w '%{http_code}\n' https://api.stage.likelion-khu.com/actuator/health
200
$ curl -s -o /dev/null -w '%{http_code}\n' https://likelion-khu.com
200
```

**주의 — 이 재부팅은 UptimeRobot이 못 잡았음**: 복구가 20~30초로 워낙 빨라서 5분 체크 틈새에 통째로 들어갔고, 재부팅 전후 UptimeRobot DOWN/UP 메일이 하나도 안 옴(메일함 실측 확인). ②(서버 전체 다운 감지)는 다운이 몇 분 이상 지속돼야 유효하다는 뜻 — 상세는 [`uptime-monitoring.md`](./uptime-monitoring.md#한계--실측-사례-2026-07-08) "한계" 참고.

**② 디스크/메모리 Alarm 실발동**

재부팅 직후 실제 리소스 사용률(임계치를 이보다 낮게 잡아야 발동한다는 근거):
```
$ df -h / | tail -1
/dev/sda1        48G  7.1G   41G  15% /
$ free -m
               total        used        free
Mem:           11927        1119        9611
```

임계치를 임시로 낮춘 시점(쿼리 변경, `time-updated` 필드로 확인):
```
disk:   DiskSpaceUtilization[5m]{resourceId="..."}.mean() > 10   (원래 80)   updated 2026-07-09T03:30:50Z
memory: MemoryUtilization[5m]{resourceId="..."}.mean() > 5       (원래 85)   updated 2026-07-09T03:30:51Z
```

`pending-duration`(5분) 경과 후 `oci monitoring alarm-status list-alarms-status`로 확인한 실제 FIRING 전환:
```
o5fzatuzsq (메모리) | FIRING | 2026-07-09T03:28:00+00:00
ip7im4kwcq (디스크) | FIRING | 2026-07-09T03:28:00+00:00
```

메모리 알람의 `get-alarm-history` — 상태 전환이 정확히 1회씩만 기록됨(중복 발동 아님, 아래 "알람 이메일 품질 개선" 참고):
```
2026-07-09T03:31:36.631Z | State transitioned from OK to FIRING       (timestamp-triggered 03:28:00Z)
2026-07-09T03:38:39.503Z | State transitioned from FIRING to OK       (timestamp-triggered 03:35:00Z, 임계치 원복 후)
```

이메일 수신: 장찬욱 본인이 실제 수신 확인("수신했어", 2026-07-09 세션 중 실시간 확인). 이후 임계치를 즉시 원래 값(80/85)으로 복원.

**③ 백업 Absence Alarm — 합성 테스트 대신 실제 장애로 검증됨**

검증 착수 시점 `alarm-status` — 테스트를 시작하기도 전에 이미 FIRING:
```
fzsu3y63pa (stage 백업) | FIRING | 2026-07-08T06:30:00+00:00
g6tsm5m7nq (prod 백업)  | FIRING | 2026-07-08T06:30:00+00:00
```

`~/backup.log`로 확인한 실제 장애 — 07-07까진 정상, 07-08부터 크론이 스크립트를 아예 못 띄움:
```
uploaded: prod/prod-2026-07-06.db
uploaded: stage/stage-2026-07-06.db
uploaded: prod/prod-2026-07-07.db
uploaded: stage/stage-2026-07-07.db
/usr/bin/env: 'bash\r': No such file or directory
/usr/bin/env: use -[v]S to pass options in shebang lines
```

원인 확인(CRLF) 및 수정:
```
$ file infra/backup-db.sh
infra/backup-db.sh: Bourne-Again shell script, Unicode text, UTF-8 text executable, with CRLF line terminators

$ cp backup-db.sh backup-db.sh.bak-crlf && sed -i 's/\r$//' backup-db.sh && file backup-db.sh
backup-db.sh: Bourne-Again shell script, Unicode text, UTF-8 text executable
```

밀린 백업 수동 1회 실행 — prod·stage 둘 다 업로드 + 메트릭 전송 성공:
```
$ ./backup-db.sh
uploaded: prod/prod-2026-07-09.db
posted BackupSuccessProd=1
uploaded: stage/stage-2026-07-09.db
posted BackupSuccessStage=1
```

메트릭 반영 후 `alarm-status` 재확인 — FIRING→OK 전환 확인(디스크·메모리 알람도 같은 시점 임계치 원복으로 함께 OK):
```
fzsu3y63pa (stage 백업) | OK | 2026-07-09T03:37:00+00:00
g6tsm5m7nq (prod 백업)  | OK | 2026-07-09T03:37:00+00:00
o5fzatuzsq (메모리)     | OK | 2026-07-09T03:35:00+00:00
ip7im4kwcq (디스크)     | OK | 2026-07-09T03:35:00+00:00
```

### 발견된 실제 장애 — backup-db.sh CRLF로 인한 백업 무중단 실패 (2026-07-08~09)

알람을 검증하려고 상태를 조회하다가, 백업 부재 알람이 합성 테스트 이전부터 이미 계속 FIRING 상태인 걸 발견했다. 원인 추적 결과 진짜 장애였다:

- `backup.log`를 보면 07-07까지는 정상 업로드됐는데 07-08 18:00 UTC 정기 cron 실행부터 `/usr/bin/env: 'bash\r': No such file or directory`로 즉시 실패 — **이틀째 실제 백업이 전혀 안 되고 있었다.**
- 원인: `infra/backup-db.sh`가 서버(Linux)에 CRLF 줄바꿈으로 올라가 있어 shebang(`#!/usr/bin/env bash\r`)이 깨짐. git 저장소의 blob 자체는 LF로 정상(`git show`로 확인) — 문제는 **로컬(Windows) 작업 트리 체크아웃**에서 `core.autocrlf=true`가 checkout 시 LF→CRLF로 되돌리고, `infra/`는 CD 파이프라인 대상이 아니라(`backend/**`·`shared/**`만 트리거) 이 작업 트리 파일을 수동으로 서버에 올리는 배포 경로라서, 그 변환된 CRLF가 그대로 서버에 전달된 것.
- 조치: 서버에서 줄바꿈 수정(백업 파일 보존) + 밀린 백업 수동 1회 실행(prod·stage 둘 다 업로드·메트릭 전송 성공, 알람 OK 전환 확인) + 재발 방지로 `infra/.gitattributes`(`*.sh`, `*.py` → `eol=lf`) 추가해 이 저장소 안에서는 어떤 Windows 체크아웃에서도 다시 CRLF로 안 바뀌게 고정.
- 교훈은 `pm/docs/learnings.md` 참고.

### 알람 이메일 품질 개선 (2026-07-09)

실발동 검증 중 두 가지가 눈에 띄어 같이 고침:

- **메시지 포맷**: 기본값 `RAW`(원시 JSON 덩어리)라 이메일 본문이 읽기 어려웠음 → 4개 알람 전부 `ONS_OPTIMIZED`(이메일 전용, 사람이 읽기 좋은 레이아웃)로 변경.
- **중복 수신**: 알람당 이메일이 2번씩 온다는 보고 → 알람 히스토리(`get-alarm-history`)로 실제 상태 전환 횟수를 확인한 결과 FIRING·OK 전환 각 1회뿐이었음. 즉 우리 알람 설정이 중복 발동한 게 아니라 **OCI Notifications(ONS)가 "at-least-once"(최소 1회, 중복 가능) 배달 방식이라 플랫폼 레벨에서 가끔 중복 전송**되는 것 — 알람 쪽에서 없앨 방법은 없고, 수신자가 "가끔 같은 알림이 두 번 올 수 있다"로 감안하는 게 맞음.
- **구독자 추가**: PM(김우진) 개인 이메일(git 커밋 작성자 정보로 확인)을 ONS 토픽에 구독 추가 — PENDING 상태로, 본인이 메일함에서 확인 클릭해야 활성화됨.

### Discord 웹훅 연동 — 검토했으나 보류 (2026-07-09)

UptimeRobot(①②)은 이미 Discord 웹훅이 붙어 있어서, 같은 채널을 OCI Alarm(③④)에도 붙일 수 있는지 실제로 테스트했다. **직결은 안 된다** — ONS가 지원하는 프로토콜에 `DISCORD`가 없고, 시도한 두 우회 방법이 실제로 다 막혔다:

- **`SLACK` 프로토콜 → Discord의 Slack 호환 URL**(`.../slack` 접미사): Discord가 Slack 웹훅 포맷을 흉내 낼 수 있다는 점을 이용하려 했으나, OCI가 구독 생성 시점에 endpoint URL이 `https://hooks.slack.com/services/`로 시작하는지 서버 단에서 강제 검증(`InvalidParameter`) — Discord URL은 이 시점에서 바로 거부됨.
- **`CUSTOM_HTTPS` → Discord 웹훅 URL 직결**: 구독은 생성되지만 `PENDING`에서 못 벗어남. HTTPS 기반 구독은 OCI가 확인용 POST를 endpoint로 보내 승인받는 핸드셰이크가 필요한데, 그 payload가 Discord 웹훅이 기대하는 JSON 스키마(`content`/`embeds` 등)가 아니라서 Discord가 조용히 버림(채널에 아무 것도 안 옴, 실측 확인) — 영원히 PENDING이라 삭제함.

두 실패 모두 원인이 같다: **OCI ONS는 Discord 포맷을 전혀 모른다.** 제대로 연결하려면 ONS 페이로드를 받아 Discord 포맷으로 바꿔 재전송하는 중계(예: Oracle Functions)가 새로 필요한데, 이건 새 리소스를 추가하는 별도 작업 범위라 이번엔 보류 — **현재는 이메일(동아리 메일 + PM 메일)로만 수신**하는 걸로 확정. Discord 연동이 필요해지면 별도 미션으로 다룰 것.
