# 리소스·백업 관측 — OCI Monitoring/Alarms/Notifications (#83)

> 인프라 문서. #83(조용한 실패를 먼저 알아채기)의 ③(디스크·메모리 사전경고)·④(백업 확신) 담당.
> ①②(외부 접속 불가·서버 전체 다운)는 [`uptime-monitoring.md`](./uptime-monitoring.md) 참고 — 이 문서와 역할이 분리돼 있음(서버 밖 vs 서버 안).

## 왜 이렇게 나눴는가

①②는 "서버가 죽어도 감지돼야" 해서 서버 밖(UptimeRobot)이 맡고, ③④는 서버가 살아있는 전제에서 "서버 자신이 스스로를 보고"하는 방식이 더 정확해서(디스크 사용률·백업 성공 여부는 서버 안에서만 정확히 알 수 있는 값) OCI Monitoring으로 갔다. "OCI 최대한 쓰자"는 방향에도 맞음 — 새 서드파티 계정 없이 이미 쓰던 OCI 안에서 전부 해결.

## 아키텍처

```
likelion-server 인스턴스 (2026-08-10 이전엔 "likelion-prod"였음 — 아래 "인스턴스 이름" 절 참고)
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
  └── Topic: likelion-ops-alerts → 이메일 구독(장찬욱·김우진 개인 메일 — 동아리 공용 메일 아님, 의도적. `infra/docs/handoff.md` "계정 인벤토리" 참고)
```

## 인스턴스 이름 — "likelion-prod"에서 "likelion-server"로 (2026-08-10)

OCI Compute 인스턴스의 실제 표시 이름이 "likelion-prod"였다 — 이 인스턴스 하나가 stage·prod 백엔드 컨테이너를 **같이** 호스팅하는데(위 "브랜치 ↔ 환경 대응" 참고), 이름은 마치 prod 전용 서버인 것처럼 보였다. 그 결과 디스크·메모리·git 드리프트처럼 **인스턴스(호스트) 전체에 대한 알람**도 전부 "likelion-prod ..."로 이름 붙어서, DB 백업·이메일 실패·ERROR 로그처럼 **진짜 prod 환경만을 가리키는 알람**(stage 짝이 있는 것들)과 구분이 안 됐다 — 어드민 알람 상태 화면(`/admin/infra/alarms`)에서 이 혼동이 실제로 지적됨.

그래서 인스턴스 표시 이름을 **"likelion-server"**로 바꾸고(OCI 콘솔·CLI 둘 다 반영, 재부팅 불필요 — 순수 표시용 라벨이라 실제 리소스 식별은 여전히 OCID 기준), 인스턴스 전체를 가리키는 알람 3개(디스크·메모리·git 드리프트)의 이름도 "likelion-server ..."로 바꿨다. `custom_likelion` 네임스페이스로 전송하는 모든 커스텀 메트릭의 `resourceDisplayName` 차원(`push-*.py` 6개 스크립트)도 같이 맞춤 — 어차피 이 값은 "어느 호스트가 보냈나"를 나타내는 라벨일 뿐, 알람 자체의 판정(`resourceId`로 매칭)엔 영향 없다.

**남은 규칙**: `likelion-server` = 이 알람들을 실제로 실행·측정하는 물리 호스트 하나(stage·prod를 같이 서빙). `likelion-prod`/`likelion-stage` = 그 알람이 가리키는 **환경**(백업·이메일·ERROR 로그처럼 환경별로 값이 따로 갈리는 것들만). 새 알람을 추가할 때 이 구분을 따를 것.

## IAM — instance principal

서버가 사람 자격증명 없이 자기 자신의 identity로 Monitoring API를 호출하게 하는 설정. `push-*.py` 스크립트들이 전부 이걸 재사용 — 새 IAM 리소스 추가 없음(단, 알람 상태 조회를 위한 `read alarms` verb는 2026-08-10 추가, 아래 표 참고).

| 리소스 | 이름 | 내용 |
|---|---|---|
| Dynamic Group | `likelion-monitoring-dyngroup` | 매칭 규칙 `ALL {instance.id = '<likelion-server OCID>'}` — 이 인스턴스 하나만 |
| Policy | `likelion-monitoring-policy` | `Allow dynamic-group likelion-monitoring-dyngroup to use metrics in tenancy` + `Allow service monitoring to use ons-topics in tenancy`(Alarm이 ONS로 발행하는 데 필요) + `Allow dynamic-group likelion-monitoring-dyngroup to read alarms in tenancy`(2026-08-10, 알람 상태 조회용) |

## Alarm 목록

| Alarm | 네임스페이스 | 쿼리 | 조건 | 심각도 |
|---|---|---|---|---|
| likelion-server 디스크 공간 80% 초과 | `custom_likelion` | `DiskSpaceUtilization[5m]{resourceId="..."}.mean() > 80` | 5분 지속 시 | CRITICAL |
| likelion-server 메모리 85% 초과 | `oci_computeagent`(네이티브) | `MemoryUtilization[5m]{resourceId="..."}.mean() > 85` | 5분 지속 시 | CRITICAL |
| likelion-prod DB 백업 26시간 이상 부재 | `custom_likelion` | `BackupSuccessProd[1h].absent(26h)` | 마지막 성공 신호로부터 26시간 경과 | CRITICAL |
| likelion-stage DB 백업 26시간 이상 부재 | `custom_likelion` | `BackupSuccessStage[1h].absent(26h)` | 마지막 성공 신호로부터 26시간 경과 | CRITICAL |
| likelion-server 배포서버 git 드리프트 감지 | `custom_likelion` | `GitDriftFileCount[10m].max() > 0` | 8분 지속 시 (`pending-duration`) | CRITICAL |
| likelion-prod 모집 이메일 실패 임계치 초과 | `custom_likelion` | `EmailFailureCountProd[5m].max() > 2` | 5분 지속 시 (`pending-duration`, = cron 주기 — 첫 breach에 바로 발동) | WARNING |
| likelion-stage 모집 이메일 실패 임계치 초과 | `custom_likelion` | `EmailFailureCountStage[5m].max() > 2` | 5분 지속 시 (`pending-duration`, = cron 주기 — 첫 breach에 바로 발동) | WARNING |
| likelion-prod 백엔드 ERROR 로그 발생 | `custom_likelion` | `ErrorLogCountProd[5m].max() > 0` | 5분 지속 시 (`pending-duration`, = cron 주기 — 첫 breach에 바로 발동) | WARNING |
| likelion-stage 백엔드 ERROR 로그 발생 | `custom_likelion` | `ErrorLogCountStage[5m].max() > 0` | 5분 지속 시 (`pending-duration`, = cron 주기 — 첫 breach에 바로 발동) | WARNING |

**백업 알람이 dead man's switch인 이유**: 백업 자체(`backup-db.sh`)는 2026-07-04부터 이미 매일 잘 돌고 있었음(cron+버킷 실측 확인됨, #83 조사 과정에서 재확인). 근데 "잘 되고 있다"를 사람이 매번 SSH로 들어가 확인해야 아는 상태였음 — 이 알람은 그 확인을 자동화한 것. 값 자체(`=1`)엔 의미가 없고, 신호가 26시간 동안 **안 들어오는 것** 자체가 이상 신호. cron이 안 돌았든, 서버가 죽었든, 백업 스크립트가 중간에 실패했든 원인 불문하고 다 잡힘. 26시간 = 매일 18:00 UTC 실행 주기(24h) + 2시간 버퍼.

**이 신호의 한계 — "자동으로 됐는지"는 구분 못 함(2026-07-27 발견)**: `push-backup-metric.py`는 `backup-db.sh`가 성공할 때마다 호출되는데, 이건 cron이 자동으로 돌렸을 때든 사람이 수동으로 재실행했을 때든 완전히 같은 코드 경로를 탄다. 그래서 대시보드에서 이 지표 추이를 그래프로 보면, 중간에 자동화가 실패해서 수동으로 살렸던 날도 "성공"으로 남아 끊김이 안 보인다 — 실제로 2026-07-08~09 CRLF 사고(위 "발견된 실제 장애" 참고) 당일도 그래프상으론 끊김 없이 이어져 있다. 즉 **이 지표(그리고 알람)는 "데이터가 보호되고 있는가"는 정확히 감지하지만, "자동화가 사람 손 안 타고 잘 돌고 있는가"는 전혀 알려주지 않는다** — 후자를 알고 싶으면 자동/수동을 구분하는 별도 신호가 필요한데 아직 없음.

**디스크 사용률이 custom metric인 이유**: OCI의 Compute Instance Monitoring 플러그인은 CPU/메모리/디스크 I/O(바이트·IOPS)는 기본 제공하지만 "디스크가 몇 % 찼는가"는 제공하지 않음(공식 문서로 확인 — 하이퍼바이저/블록스토리지 레벨에선 파일시스템 내부를 모름, OS 안에서만 알 수 있는 정보). 그래서 서버 위 스크립트가 직접 `df` 값을 계산해서 채워 넣음.

**git 드리프트 감지 이유**: 배포 서버의 git 워킹트리가 SSH로 직접 수정되거나 gitignore 안 된 낯선 파일이 생기면(사람이 직접 고쳤든, 미머지 브랜치 검증을 서버에서 먼저 했든) 다음 배포부터 계속 깨진다(실제 사고: 서버가 몇 주째 옛날 커밋에 고정된 채 배포마다 롤백만 반복 — 당시엔 `git pull`이 이런 충돌에 조용히 실패하는 방식이었음, 2026-07-30부터는 `git reset --hard`라 이 특정 실패 양상 자체는 덜 나지만 "낯선 파일이 있다"는 신호로서의 가치는 여전함). `infra/scripts/push-git-drift-metric.py`가 `git status --porcelain` 라인 수를 그대로 메트릭 값으로 씀 — gitignore된 파일(`.env.*`, `infra/nginx.conf`, `infra/data/`, `infra/.prev_backend_tag_*`)은 애초에 `git status`에 안 잡히므로 "서버 전용 정상 파일"과 "git이 몰라야 하는데 존재하는 파일"이 자동으로 구분됨.

**알려진 사각지대였던 것 — 해소됨(2026-07-26 발견 → 2026-07-30 정리)**: 이 알람은 `git status --porcelain`(작업트리의 미커밋 변경)만 본다 — **서버 로컬 브랜치가 이미 커밋된 채로 `origin`과 갈라져 있는 것(diverged)은 이 알람으로는 못 잡는다.** 실제로 서버의 `dev`가 `origin/dev`와 최대 54커밋(로컬 전용)까지 분기됐던 적이 있는데, 워킹트리는 clean이라 이 알람은 계속 OK였다. 원인은 서버 배포 키가 read-only인데 `git pull`(=fetch+merge)을 써서, 그 pull이 만드는 병합 커밋을 다시 push 못 해 배포할 때마다 쌓인 것 — `git reset --hard origin/<브랜치>`로 정리했고, `cd.yml`도 이제 pull 대신 reset을 써서 이 어긋남 자체가 구조적으로 다시 안 쌓인다(`infra/CLAUDE.md` "서버 dev 동기화" 절 참고). 대응은 [`RUNBOOK.md`](./RUNBOOK.md#cheat-sheet) "자주 쓰는 명령" 절 참고.

**모집 이메일 실패 임계치 알림 이유(#113)**: 개별 이메일 실패(주소 오탈자 등)는 정상적인 간헐 현상이라 1건마다 알림이 오면 알림 피로만 커진다. 이 알람이 잡으려는 건 "갑자기 전부 다 실패"하는 시스템적 장애(SMTP 인증 깨짐·OCI Email Delivery 릴레이 장애 등)다. 백업 알람(dead man's switch, 신호 *부재*를 봄)과 반대로 이건 신호가 *과다*할 때 잡는 Threshold Alarm — `email_log`가 신호 자체(실패했다는 사실)를 이미 갖고 있어서 새 계측이 아니라 그 값을 읽기만 하면 됐다.

- **수신자 쪽 원인 실패는 아예 카운트에서 뺀다(#113 후속, 장찬욱 요청)**: 처음엔 "임계치를 낮게 잡으면 오탈자 몇 건쯤은 노이즈로 묻힌다"는 정도로만 대응했는데, 이 알람이 "우리가 손볼 수 있는 문제"만 가리켜야 한다는 요구를 다시 짚어보니 그걸론 부족했다 — 주소 오탈자가 우연히 몰리면(예: 모집 안내메일을 한 번에 수백 명에게 보낼 때) 인프라가 손볼 게 전혀 없는데도 알람이 울릴 수 있었다. `EmailService`가 이제 실패마다 원인을 `email_log.failure_cause`에 7가지(`RECIPIENT_ADDRESS_INVALID`·`RECIPIENT_ADDRESS_REJECTED_BY_SERVER`·`INVALID_INPUT`·`TEMPLATE_RENDERING_FAILED`·`SMTP_AUTHENTICATION_FAILED`·`SMTP_CONNECTION_FAILED`·`UNKNOWN_FAILURE`)로 분류해서 남기고, `push-email-failure-metric.py`는 앞의 두 값(둘 다 "결국 주소 형식 문제" — 하나는 우리 클라이언트 검증에서, 하나는 OCI 서버 쪽 재검증에서 걸림, `backend/docs/email-module.md` "실패 원인 분류" 참고)만 뺀 나머지를 센다(재시도·분류 근거는 같은 문서 "재시도와 멱등성" 절 참고). 이 컬럼 도입 이전의 과거 FAILURE 행은 `NULL`인데, 알람 입장에선 "우리 쪽 원인이 아니라고 확인된 적 없다"는 뜻이라 안전하게 카운트에 포함시킨다(놓치는 것보다 오탐이 낫다는 원칙 — 디스크·메모리 알람과 동일).
- **왜 백엔드 API를 새로 안 만들었나**: `push-disk-metric.py`가 `df`를 직접 읽는 것과 같은 이유 — `ubuntu` 계정은 이미 DB 파일에 직접 접근 가능하므로(`db-access.md`), `push-email-failure-metric.py`가 `sqlite3`로 `email_log`를 직접 조회한다. 새 HTTP 표면·인증 경로가 안 생긴다.
- **왜 임계치가 낮은가(> 2)**: 클럽 사이트라 발송량 자체가 적다(모집 알림 신청·초대·비번재설정 정도) — 대량 트래픽 서비스라면 노이즈였을 "5분에 3건 이상"도 이 규모에선 시스템적 문제일 가능성이 높다. 실제 운영해보고 오탐이 잦으면 올릴 것(디스크·메모리 알람도 실측 후 튜닝된 전례가 있음, 위 참고).
- **왜 severity가 WARNING인가(다른 4개는 CRITICAL)**: 디스크·메모리·백업부재·git드리프트는 "사이트 생존"에 직결되지만, 이메일 실패는 모집 알림 발송 실패로 사용자 경험은 나빠져도 사이트 자체는 계속 정상 동작한다 — 즉시 대응이 필요한 CRITICAL보다는 확인이 필요한 WARNING이 맞다고 판단.
- **왜 pending-duration이 cron 주기와 같은가(P=C=5분, "연속 2번 나쁨" 요구 안 함)**: 처음엔 git드리프트 알람처럼 P를 C보다 크게 잡아(C=15/P=20분) 단일 blip을 걸러내려 했는데, 이 지표엔 안 맞는 전제였다. 디스크·메모리는 5분마다 "지금 값"이 항상 존재하는 연속 샘플링 지표라 P>C로 "진짜 지속" 여부를 가릴 수 있지만, 이메일 발송은 클럽 규모상 요청 자체가 뜸하다가 몰릴 때 한꺼번에 몰리는 성격(장찬욱 실측 지적, 2026-07-29)이라 "연속된 나쁜 tick"이 보장되지 않는다. 예를 들어 모집 열림 전환으로 구독자 전원에게 한 번에 발송하다 SMTP가 통째로 죽으면, 그 실패들이 슬라이딩 윈도우 한 구간에만 걸리고 그다음 틱엔 이미 윈도우 밖으로 밀려나 0으로 돌아갈 수 있다 — P>C 요구를 그대로 두면 **이런 진짜 burst 장애를 알람이 영영 못 잡는** 구조적 결함이 생긴다. 그래서 디스크·메모리와 같은 P=C(`k_min = ceil((C-W)/C)+1 = 1`, W=C=5분이라 첫 breach에 바로 발동)로 맞췄다 — "튄 값 한 번은 무시"가 아니라 "이 규모에서 5분에 3건 이상 실패는 그 자체로 이미 드문 신호"라는 판단. C(=W=P)는 15분으로 시작했다가, "이렇게까지 오래 기다려야 하나" 지적(장찬욱, 2026-07-29)에 디스크·git드리프트와 같은 5분으로 낮춰 감지 시간을 3배 단축했다 — sqlite 조회는 가벼운 SELECT라 주기를 낮춰도 비용이 안 든다.
- **슬라이딩 윈도우 이중 카운트 주의**: `push-email-failure-metric.py`의 SQL 자체가 "최근 5분 안 실패 건수"를 매번 새로 세므로, 같은 실패 1건이 여러 cron tick에 걸쳐 반복 카운트될 수 있다(예: 한 건이 5분 윈도우에 여러 tick 동안 계속 잡힘). 이건 "새로 발생한 실패 수"가 아니라 "지금 이 순간 최근 5분 안에 실패가 몇 건 쌓여 있는가"를 보는 지표라 의도된 동작 — 대량 실패가 5분 넘게 지속되면 계속 높은 값을 유지해 알람이 계속 breaching 상태를 유지하는 게 오히려 목적에 맞는다(디스크 사용률처럼 "현재 상태" 지표와 같은 성격, 백업처럼 "이벤트 발생 여부"가 아님).

### 백엔드 ERROR 로그 알람 — `ErrorLogCountProd`/`Stage` (website #313 후속)

website #313에서 GlobalExceptionHandler·LoggingErrorAttributes로 "예상 못한 서버 에러"를
ERROR 레벨로 로그에 남기는 것까지는 됐지만, 그 로그를 사람이 능동적으로 SSH로 들어가
열어보지 않으면 아무도 모르는 상태였다. 이 알람은 이메일실패 알람과 같은 패턴(5분 윈도우,
cron 주기, instance principal)이지만 판단 기준은 다르다.

- **왜 임계치가 0(이메일실패는 >2)인가**: website #313 설계상 ERROR 레벨은 "정상적인 클라이언트
  흐름(4xx 등)"이 아니라 "우리가 미처 몰랐던 버그"에만 쓰도록 의도적으로 좁혀뒀다(`GlobalExceptionHandler`
  주석 참고 — 흔한 4xx는 로깅 안 함). 그래서 이메일 오탈자처럼 "정상적으로 간헐 발생하는" 노이즈가
  아니라, 한 건이라도 나면 그 자체로 이미 확인이 필요한 신호다.
- **로그 파일을 직접 읽는 이유**: `push-email-failure-metric.py`가 `email_log` 테이블을 직접 읽듯,
  ERROR 로그는 DB가 아니라 파일에만 있어서 `infra/logs/{prod,stage}/` 안 가장 최근에 수정된
  파일(=현재 배포가 쓰고 있는 파일)을 찾아 최근 5분 이내 타임스탬프의 ERROR 줄만 센다. 새 API를
  안 만드는 이유는 다른 push 스크립트들과 동일(새 HTTP 표면이 안 생김).
- **severity가 WARNING인 이유**: 디스크·메모리·백업부재·git드리프트처럼 사이트 생존에 직결되진
  않고(에러 난 그 요청만 실패, 나머지는 정상 동작), 확인이 필요한 수준이라 이메일실패 알람과
  같은 판단.

### 발송 성공 시계열 — `EmailSuccessCountProd`/`Stage` (알람 없음, #113 후속)

실패 임계치 알람은 "뭔가 잘못됐다"는 부정 신호만 준다 — "지금 발송이 정상적으로 되고 있다"는 긍정 신호는 온디맨드로 `email_log`를 직접 조회하거나(`db-access.md`) OCI Deliverability Dashboard(90일 반송률·평판 추이, 인프라 전체 관점이라 개별 앱 로그 기준은 아님)를 봐야 했다(장찬욱 질문, 2026-07-30). 대시보드에 얹을 수 있는 시계열이 따로 없었던 것.

`push-email-success-metric.py`가 `push-email-failure-metric.py`와 완전히 같은 패턴(같은 5분 윈도우·같은 cron 주기·같은 instance principal 인증)으로 `email_log`의 `status = 'SUCCESS'` 건수를 그대로 센다. **알람은 안 건다** — 값이 0이어도 "그 5분 동안 아무도 안 보냈다"일 뿐이라(클럽 사이트라 발송 자체가 간헐적), 절대 임계치로는 판단이 안 되고 실패 카운트와 나란히 놓고 "지금 이 순간 성공/실패 비율이 어떤가"를 보는 용도다.

**OCI 콘솔에서 그래프로 보는 법**(따로 만들어둔 대시보드는 없음 — 콘솔에서 바로 조회 가능):
1. `Observability & Management → Monitoring → Metrics Explorer`
2. 컴파트먼트: 루트, 네임스페이스: `custom_likelion`, 메트릭: `EmailSuccessCountProd`(또는 `Stage`) — 필요하면 `EmailFailureCountProd`도 같이 추가해 겹쳐 그리면 성공/실패 비율이 한눈에 보임
3. 이 화면을 그대로 저장하려면 우측 상단 `Save as` → 기존 대시보드가 없다면 새 커스텀 대시보드(`Dashboards`) 생성 후 위젯으로 추가 — 콘솔 UI 조작이라 CLI/코드로는 자동화하지 않음(추가할 위젯이 근본적으로 이거 하나뿐이라 굳이 IaC로 관리할 만큼은 아니라고 판단, 필요성이 커지면 그때 재검토)

### 알람 튜닝 사고 모델 — 쿼리 윈도우 · pending-duration · cron 주기의 관계

커스텀 메트릭 알람을 튜닝할 때 서로 얽혀 있는 변수 4개:

| 변수 | 의미 |
|---|---|
| **C** (cron 주기) | 메트릭이 실제로 몇 분마다 새로 찍히는가 |
| **W** (쿼리 윈도우) | 알람 쿼리 `[Xm]` — 매 평가 시점에 최근 몇 분을 뭉쳐서 보는가 |
| **R** (resolution) | 알람이 몇 분마다 재평가하는가 (보통 1분 고정) |
| **P** (pending-duration) | breaching이 몇 분 연속돼야 실제 FIRING으로 전환되는가 |

**관계 ① — W는 C 이상이어야 한다.** 메트릭이 C분에 한 번만 찍히므로 W < C면 두 push 사이에 윈도우 안에 데이터가 아예 없는 구간(no data)이 생겨 breaching 카운트가 끊긴다. 실전 제약: `W ≥ C` (지터 감안해 여유를 좀 둠).

**관계 ② — 스미어링.** `[Xm].max()` 같은 쿼리는 "최근 X분 안에 나쁜 값이 있었나"만 보므로, 값이 단 한 틱만 나빴어도 그 뒤로 W분 동안은 계속 "나쁨"으로 보인다 — 실제 지속시간과 무관하게 **관측 breaching 지속시간 = W분**(단일 blip 기준). 한 점을 찍어서 그 뒤로 쭉 문질러(smear) 놓은 것과 같다.

**관계 ③ — 파이어에 필요한 최소 연속 tick 수.** 실제로 나쁜 상태가 k번 연속 cron tick(=`(k-1)×C`분 실제 지속) 동안 찍혔다면, 알람이 관측하는 총 breaching 시간은 `(k-1)×C + W`. 이게 P 이상이어야 FIRING:

```
k_min = ceil( (P - W) / C ) + 1
```

**W ≥ P**면 k=1(단 한 번의 blip)만으로 이미 파이어. **W < P**여야 비로소 k≥2(실제 2번 이상 연속된 진짜 상태)가 필요해진다. 그런데 관계①(W≥C)과 동시에 만족하려면 `C ≤ W < P`, 즉 **P가 C보다 확실히 커야만** "blip 한 번은 무시하고 진짜 지속만 잡는" 설계가 가능하다 — **P ≤ C면 W를 아무리 조정해도 구조적으로 단일 blip을 못 피한다.**

**관계 ④ — OK 복귀 속도는 P와 무관하게 W만 결정한다.** 문제가 실제로 사라지면 마지막 나쁜 push가 윈도우에서 밀려나는 순간(=W분 후) 바로 OK로 돌아간다. P가 커도 복귀가 늦어지진 않는다.

| 하고 싶은 것 | 조절할 변수 |
|---|---|
| 순간적 blip 무시하고 "진짜 지속"만 잡기 | **P를 C보다 확실히 크게** |
| 문제 해소 후 OK 복귀를 빠르게 | **W를 줄이기** (단 W≥C 유지) |

**실제 사례(2026-07-12)**: 배포 스크립트가 정상적으로 만들었다 지우는 롤백 마커 파일(`infra/.prev_backend_tag_stage`)이 gitignore 누락으로 드리프트로 잡혀, `C=5분, W=10분, P=5분`(이후 3분으로 낮췄다가) 조합에서 1분짜리 정상 상태가 오탐 FIRING을 일으킴. 근본 수정(gitignore 추가)과 별개로, `P=3분`(≤C=5분) 상태에서는 어떤 W를 골라도 구조적으로 단일 blip을 못 피한다는 걸 확인 → **P=8분(>C=5분)으로 조정**해 앞으로 순간적 상태 한 번으로는 안 뜨고, 최소 2번 연속 cron tick 동안 실제로 더러워야 파이어하도록 변경.

### 쉬운 설명 — 감시카메라 사진첩 비유 (팀 온보딩용, 한글 용어 + 다이어그램)

위 C/W/R/P 표기가 처음 보면 헷갈리니, 같은 내용을 감시카메라 비유 + 한글 이름으로 다시 풀어둔다.

| 알파벳 | 한글 이름 | 감시카메라 비유 |
|---|---|---|
| C | **촬영주기** | 카메라가 몇 분마다 사진을 한 장 찍는가 |
| W | **관찰범위** | 판정관이 "최근 몇 분치 사진첩"을 펼쳐 보는가 (쿼리 `[Xm]`) |
| R | **재확인주기** | 판정관이 몇 분마다 그 사진첩을 다시 펼쳐 보는가 (보통 1분) |
| P | **벨조건시간** | "나쁨"이 몇 분 연속돼야 실제로 벨을 울리는가 (pending-duration) |

핵심은 판정관이 "새 사진이 왔는지"를 기다리는 게 아니라는 점이다 — **재확인주기마다 그냥 사진첩을 다시 펼쳐볼 뿐**이고, 나쁜 사진 한 장은 찍힌 뒤로 관찰범위만큼의 시간 동안 계속 그 사진첩 안에 남아있다. 그래서 재확인주기마다 다시 열어봐도 같은 나쁜 사진을 계속 재사용해서 보게 된다 — 진짜로 여러 번 나쁜 일이 일어난 게 아니라, 한 번 일어난 일을 여러 번 들여다본 것뿐인데도 "연속 나쁨" 조건이 채워질 수 있다.

**사진첩 예시 (촬영주기=5분, 관찰범위=5분, 벨조건시간=3분) — 벨조건시간이 관찰범위보다 작아서 사진 한 장만으로 울리는 경우:**

```
분:         0    1    2    3    4    5    6    7
사진찍힘:   🔴                       🟢
            (나쁨 한 장, 그 뒤로는 계속 정상)

최근 5분 사진첩(관찰범위) 안에 나쁜 사진이 들어있나?
  0분  [-5,0]  있음
  1분  [-4,1]  있음
  2분  [-3,2]  있음
  3분  [-2,3]  있음   ← 벨조건시간(3분) 채워짐
  4분  [-1,4]  있음
  5분  [ 0,5]  있음 (0분 사진이 아직 딱 걸쳐있음)
  6분  [ 1,6]  없음! (0분 사진이 드디어 관찰범위 밖으로 밀려남)

판정상태:    나쁨 나쁨 나쁨 나쁨 나쁨 나쁨  OK
연속나쁨시간: 0분  1분  2분  3분  4분  5분
                              ↑                ↑
                     🚨 3분에 FIRING     6분에 OK 복귀 (=관찰범위만큼 지난 뒤)
```

**같은 상황인데 벨조건시간만 8분으로(관찰범위보다 확실히 크게) 올리면 — 사진 한 장으로는 안 울림:**

```
분:         0    1    2    3    4    5    6    7    8
사진찍힘:   🔴                       🟢
나쁨?:      예   예   예   예   예   예   아니오 아니오 아니오
연속나쁨시간: 0분  1분  2분  3분  4분  5분  (여기서 끊김 — 8분을 못 채움)
                                        ↑
                                  OK 유지, 벨 안 울림
                          (진짜 두 번째 나쁜 사진이 와서
                           나쁨이 5분을 넘어 계속 이어져야만 울림)
```

**세 번째 예시 (촬영주기=5분, 관찰범위=5분, 벨조건시간=8분) — 이번엔 진짜로 연속 두 번 나빠서 울리는 경우:**

바로 위 예시에서 벨조건시간을 8분으로 올렸더니 사진 한 장(=1번 나쁨)만으론 안 울렸다. 그런데 만약 다음 사진(5분 뒤)도 또 나쁘게 나오면 — 즉 나쁨이 실제로 2번 연속이면 — 어떻게 될까:

```
분:         0    1    2    3    4    5    6    7    8    9   10   11
사진찍힘:   🔴                       🔴                       🟢
            (1번째 나쁨)              (2번째 나쁨, 연속)         (드디어 정상)

최근 5분 사진첩(관찰범위) 안에 나쁜 사진이 들어있나?
   0분 [-5, 0]  있음 (0분 사진)
   1~4분         있음 (0분 사진 아직 안 밀려남)
   5분 [ 0, 5]  있음 (0분·5분 사진 둘 다 걸쳐있음)
   6~9분         있음 (5분 사진 아직 안 밀려남)
  10분 [ 5,10]  있음 (5분 사진이 딱 걸쳐있음)
  11분 [ 6,11]  없음! (5분 사진도 드디어 관찰범위 밖으로 밀려남)

판정상태:    나쁨 나쁨 나쁨 나쁨 나쁨 나쁨 나쁨 나쁨 나쁨 나쁨 나쁨  OK
연속나쁨시간: 0분  1분  2분  3분  4분  5분  6분  7분  8분  9분  10분
                                             ↑                       ↑
                                    🚨 8분에 FIRING            11분에 OK 복귀
                                    (벨조건시간 8분 채워짐)    (=마지막 나쁜사진(5분)+관찰범위(5분) 뒤)
```

바로 앞 예시(사진 한 장, 벨조건시간 8분)와 똑같은 설정인데, 이번엔 **진짜 두 번째 나쁜 사진이 실제로 찍혔기 때문에** 나쁨이 5분을 넘어 10분까지 이어지고, 그 10분 안에 벨조건시간 8분이 들어있어 실제로 FIRING한다. 앞 예시는 "1번만 나쁨 → 안 울림", 이번 예시는 "2번 연속 나쁨 → 울림"이라 두 개를 나란히 보면 벨조건시간(P)이 실제로 무엇을 걸러내는지가 분명해진다 — **한 번의 우연은 걸러내고, 진짜로 재발한 것만 잡는다.**

공식으로 확인하면: `k_min = ceil((P-W)/C)+1 = ceil((8-5)/5)+1 = ceil(0.6)+1 = 2` — 최소 2번 연속 나쁜 사진이 필요하다는 계산과 정확히 일치한다.

**인과관계로 정리하면 — 뭐가 뭘 결정하는가:**

```
촬영주기  (사진 찍는 간격 — 크론 주기, 우리가 스크립트 만들 때 정함)
   │
   │  제약 ①: 관찰범위 ≥ 촬영주기 여야 함
   │  (아니면 사진첩에 빈 구간이 생겨서 판정 자체가 끊김)
   ▼
관찰범위  (사진첩 크기 — 쿼리 [Xm], 우리가 정함)
   │
   │  촬영주기와 관찰범위가 같이 결정하는 것: 진짜로 몇 번 연속
   │  나쁜 사진이 찍혔을 때, 판정관이 "나쁨"으로 관측하는 총 시간
   │        = (연속나쁨횟수-1)×촬영주기 + 관찰범위
   ▼
관측된 나쁨 지속시간
   │
   │  이걸 벨조건시간과 비교해서 벨 여부 결정
   ▼
벨조건시간  (몇 분 연속 나빠야 우는가, 우리가 정함)
   │
   ├─ 벨조건시간 ≤ 관찰범위  →  사진 한 장으로도 조건 충족 → 🚨 오탐 위험 큼
   └─ 벨조건시간 >  관찰범위  →  한 장으론 부족, 진짜 두 번째 나쁜 사진 필요 → 진짜 지속만 걸러 울림
   │
   ▼
🚨 FIRING 시점 (= 관측 나쁨 지속시간이 벨조건시간을 넘는 순간)


별도 갈래 — 벨조건시간·연속나쁨횟수와 무관하게 관찰범위 혼자 결정하는 것:
관찰범위  ─────────────────────────►  OK 복귀 시점 (= 마지막 나쁜 사진 + 관찰범위)
```

**재확인주기(R)는 왜 이 인과선에 안 들어가는가 — 이 프로젝트에서는 안 들어가지만, 일반적으로는 지연 요인이다.** 재확인주기가 촬영주기보다 느리면(예: 1분마다 사진을 올리는데 판정관이 2분마다만 확인하면), 사진은 이미 찍혀 있어도 판정관이 아직 열어보지 않은 만큼 최대 재확인주기 분(分)만큼 판정이 밀린다 — FIRING뿐 아니라 OK 복귀도 같이 밀린다. 지금 이 프로젝트의 재확인주기(보통 1분 고정)는 모든 커스텀 메트릭의 촬영주기(5분)보다 훨씬 빠르기 때문에 이 지연이 실질적으로 0이라 인과선에서 뺀 것뿐이다 — 재확인주기가 촬영주기보다 크거나 비슷해지는 조합을 새로 만들 땐 이 지연을 다시 고려해야 한다.

## 어드민 대시보드 시스템 지표 — OCI Monitoring과 별개 경로 (2026-08-10, #451)

어드민 화면에 CPU·메모리·디스크 시계열을 보여주는 요구가 나왔을 때, 처음엔 "이미 OCI Monitoring에 값이 있으니 백엔드가 그걸 조회하면 되지 않나"로 시작했다. 하지만 백엔드는 호스트가 아니라 Docker 컨테이너 안에서 도는데, 백엔드가 OCI Monitoring을 **읽으려면** 새 OCI Java SDK 의존성 + instance principal의 read 권한(현재 정책은 `use metrics`뿐이라 read까지 되는지 미확인) + IAM 정책 재확인이 필요했고, "그럼 컨테이너 안에서 `/proc`를 직접 읽으면?"이라는 대안도 검토했지만 정확한 호스트 값을 보려면 호스트의 `/proc`·`/sys`·`/`를 컨테이너에 마운트해야 해서 컨테이너 격리를 크게 깨는 쪽이었다(백엔드 컨테이너가 뚫리면 호스트 전체를 정찰할 수 있는 창구가 생김).

그래서 배포 이력(#451, 위 절들과 동일 이슈)과 완전히 같은 패턴으로 갔다: **`infra/scripts/snapshot-system-metrics.py`가 호스트에서(크론으로, venv 불필요하지만 등록 편의상 같은 venv 재사용) CPU/메모리/디스크를 직접 읽어 로컬 JSON Lines(`infra/logs/system-metrics/snapshot.jsonl`)에 append하고, 백엔드는 그 파일을 읽기 전용 마운트로 조회만 한다.** 새 OCI SDK도, 새 IAM 정책도, 컨테이너 마운트 확장도 전혀 필요 없다.

- **OCI Monitoring 쓰기(디스크 알람 등)는 안 건드렸다** — `push-disk-metric.py`는 그대로 유지. 이 스크립트는 그거와 별개로 "어드민 화면에 보여주기용"만 담당한다. 즉 디스크 사용률은 지금 **두 스크립트가 각자 독립적으로 계산해서 각자의 목적지(OCI Monitoring vs 로컬 파일)로 보낸다** — 알람이 보는 값과 어드민 화면이 보여주는 값이 완전히 같은 소스는 아니지만, 둘 다 같은 `shutil.disk_usage("/")`라 실질적으로는 같은 값이 나온다.
- **CPU/메모리는 새로 계측한다** — 지금까지 CPU/메모리는 OCI Compute Agent 플러그인이 자동으로 재는 값만 있었고(어느 스크립트도 직접 안 잼), 이 스크립트가 처음으로 `/proc/stat`(idle 대비 busy 비율, 1초 샘플링)·`/proc/meminfo`(`MemAvailable` 기준)를 직접 읽는다. OCI 네이티브 값과 정확히 일치하진 않을 수 있지만(계측 방식이 다름), 같은 정의로 5분마다 일관되게 재는 시계열이라 추이를 보는 용도로는 충분하다고 판단.
- **알람과는 무관** — 이 화면은 조회 전용이고(#451 스코프), 여기 값이 임계치를 넘어도 알림이 오지 않는다. 실제 알람은 여전히 위 "Alarm 목록"의 OCI Monitoring 알람이 담당한다. 화면 하단에 이 구분을 문구로 명시해뒀다.
- **보관 기간**: 5분 간격 기준 30일치(8,640줄)만 유지 — 스크립트 자체가 append 후 넘치면 트림한다(`cleanup-old-logs.sh` 같은 별도 정리 스크립트 불필요).
- **크론 오프셋(2026-08-10)**: 다른 8개 push-*.py가 전부 `*/5 * * * *`(=`:00,:05,:10...`)라 이 스크립트도 처음엔 같이 등록했는데, 매 5분 경계마다 python 프로세스 9개가 동시에 뜨면서 이 인스턴스(`nproc=2`)에 순간 컨텐션이 생겼다. 이 스크립트는 하필 그 순간의 CPU 사용률을 1초 샘플링으로 재는 거라, 몰린 순간을 그대로 "cpuPercent=100%"로 찍어버림(실측: 4틱 연속 100.0인데 그 사이 `top`/`uptime`은 완전 유휴 — load average 0.03). 그래서 `2-59/5 * * * *`(`:02,:07,:12...`)로 2분 오프셋을 줘서 다른 8개와 안 겹치게 분리했다. 나머지 8개는 카운트/존재 체크라 타이밍이 로직에 안 얽혀 있어 그대로 둠.

## 어드민 대시보드 알람 상태 — 시스템 지표와 반대로 OCI Monitoring을 거쳐야 함 (2026-08-10)

위 시스템 지표(CPU/메모리/디스크)는 호스트에서 직접 관측 가능한 값이라 OCI Monitoring을 안 거쳤지만, **알람의 FIRING/OK 상태는 로컬에서 관측 불가능하다** — OCI Monitoring이 threshold·period·지속시간(위 "지속성 판정" 절)을 계산해 내리는 판정 그 자체라, 로컬에서 재현하려면 그 로직을 다시 짜야 한다(오탐/미탐 버그를 새로 만들 위험). 그래서 "OCI를 거칠까"는 선택지가 아니고, "OCI를 어디서 거칠까"만 남는다:

- **백엔드 컨테이너가 직접 조회** — 새 OCI Java SDK 의존성 + 새 IAM read 정책 필요. 시스템 지표 설계 때 이미 검토했다가 보류된 것과 같은 이유로 피함.
- **호스트 크론이 조회 → 로컬 파일 → 백엔드는 읽기만(선택)** — `snapshot-system-metrics.py`와 같은 마운트 패턴을 재사용. 백엔드엔 아무것도 안 얹고, 이미 신뢰하는 `~/oci-monitor-venv`(instance principal)만 확장.

`infra/scripts/snapshot-alarm-status.py`가 `list_alarms_status`로 전체 알람의 현재 상태(FIRING/OK)를 받아 `infra/logs/alarm-status/snapshot.jsonl`에 5분마다 한 줄(전체 알람 스냅샷)씩 남기고, 백엔드는 최신 한 줄만 조회한다(시계열이 아니라 "지금" 상태만 의미 있음). cron은 다른 `push-*.py`들과 같은 `*/5 * * * *`로 뒀다 — API 호출 한 번이라 `snapshot-system-metrics.py`처럼 CPU 샘플링이 컨텐션에 취약한 문제가 없어 오프셋이 불필요하다.

**미결 — 서버에 실제로 반영하기 전에 인프라 오너가 확인 필요:**
- 위 IAM 정책(`likelion-monitoring-policy`)은 지금 `use metrics`만 허용한다. 알람 상태를 **읽으려면** `read alarms`(또는 실제 OCI 정책 문서 기준 정확한 verb/resource-type) 권한을 추가해야 한다 — 안 하면 스크립트가 인증 오류로 실패한다.
- `list_alarms_status`가 기본 엔드포인트로 응답하는지 실측 필요. 안 되면 `push-disk-metric.py`처럼 조회용 엔드포인트를 명시해야 할 수 있다.
- 첫 실행 후 `infra/logs/alarm-status/snapshot.jsonl`에 실제 알람 9개가 기대한 형태로 찍히는지 확인.
- 크론 등록 + `docker-compose.yml`의 새 마운트(`./logs/alarm-status:/app/alarm-status:ro`) 반영.

## 파일

| 파일 | 역할 |
|---|---|
| `infra/scripts/push-disk-metric.py` | 디스크 사용률(%) → custom metric. cron `*/5 * * * *`로 실행 |
| `infra/scripts/snapshot-system-metrics.py` | CPU·메모리·디스크 사용률(%) → 로컬 JSON Lines(어드민 대시보드용, OCI Monitoring 안 거침). cron `2-59/5 * * * *`로 실행(다른 push-*.py들과 2분 오프셋, 위 "크론 오프셋" 참고) |
| `infra/scripts/snapshot-alarm-status.py` | OCI Monitoring `list_alarms_status` 조회 결과(FIRING/OK) → 로컬 JSON Lines(어드민 대시보드용). cron `*/5 * * * *`로 실행 — IAM 정책에 `read alarms` 추가 필요(미결, 위 절 참고) |
| `infra/scripts/push-backup-metric.py` | 백업 성공 신호 → custom metric. `backup-db.sh`가 각 DB 백업 성공 직후 호출 |
| `infra/scripts/backup-db.sh` | 기존 백업 스크립트 + 성공 시 `push-backup-metric.py` 호출 한 줄 추가됨 |
| `infra/scripts/push-git-drift-metric.py` | 배포 서버 git 워킹트리 드리프트(`git status --porcelain` 라인 수) → custom metric. cron `*/5 * * * *`로 실행 |
| `infra/scripts/push-email-failure-metric.py` | 최근 5분 `email_log` 실패 건수(prod/stage 각각) → custom metric. cron `*/5 * * * *`로 실행 (인자 `prod`/`stage`로 두 줄 등록, #113) |
| `infra/scripts/push-error-log-metric.py` | 최근 5분 backend ERROR 로그 줄 수(prod/stage 각각) → custom metric. cron `*/5 * * * *`로 실행 (인자 `prod`/`stage`로 두 줄 등록, website #313 후속 — 로깅은 도입됐지만 사람이 능동적으로 안 보면 놓치던 문제) |

서버의 `~/oci-monitor-venv`(venv, oci SDK만 설치)는 레포에 없음 — 최초 세팅 시 아래로 재현:
```bash
python3 -m venv ~/oci-monitor-venv
~/oci-monitor-venv/bin/pip install oci
```
(Ubuntu 24.04는 `python3.12-venv` 패키지가 먼저 필요할 수 있음 — `sudo apt-get install -y python3.12-venv`)

## 알림 — 어디로 오고 무엇을 근거로 판단하나

- **어디로**: ONS Topic `likelion-ops-alerts` 구독자(장찬욱·김우진 개인 메일, 2026-07-27 실측 확인 — 이 문서·아래 표에 있던 "동아리 메일" 표기는 실제와 달라 정정함). 디스크·메모리·백업부재(prod/stage)·git드리프트·이메일실패(prod/stage) 7개 알람 전부 이 토픽 하나로만 발행하도록 만들 것(`destinations` 동일 지정) — **이메일 하나를 이 토픽에 구독시키면 7개 알람 전부를 받는다**, 알람별로 따로 등록할 필요 없음.
- **판단 근거**: 메일 제목/본문에 어떤 Alarm이 왜 울렸는지 그대로 담겨 있음(위 표의 body 텍스트). 디스크/메모리는 "지금 값이 임계치를 넘었다", 백업은 "마지막 성공 신호로부터 26시간 지났다", 이메일실패는 "최근 5분 안에 실패가 N건 쌓였다"
- **확인 방법**: OCI 콘솔 `Observability & Management → Monitoring → Alarm Definitions`(컴파트먼트는 루트, 리전은 `ap-tokyo-1`로 맞출 것 — 안 그러면 안 보임, 실제로 헷갈렸던 지점)
- **알람 왔을 때 뭘 해야 하는지(대응 절차)**: [`RUNBOOK.md`](./RUNBOOK.md#alarm-response)

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

두 실패 모두 원인이 같다: **OCI ONS는 Discord 포맷을 전혀 모른다.** 제대로 연결하려면 ONS 페이로드를 받아 Discord 포맷으로 바꿔 재전송하는 중계(예: Oracle Functions)가 새로 필요한데, 이건 새 리소스를 추가하는 별도 작업 범위라 이번엔 보류 — **현재는 이메일(장찬욱·김우진 개인 메일)로만 수신**하는 걸로 확정. Discord 연동이 필요해지면 별도 미션으로 다룰 것.
