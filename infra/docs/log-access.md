# 로그 접속 — `X-Request-Id`로 내 요청의 로그 찾기

> 인프라 문서. 배경은 [`logging.md`](./logging.md)(로그 영속화 구조)와 website #404(요청추적 ID) 참고.

## 왜 이 문서가 필요한가

website #404부터 서버가 응답하는 모든 요청에 `X-Request-Id` 헤더가 붙고, 그 요청 처리 중 찍히는 모든 로그 줄에도 같은 값이 `reqId=...`로 따라붙는다(`logging.md` "버그 리포트에 활용하기" 참고). 근데 이걸 실제로 활용하려면 로그 파일이 있는 서버에 SSH로 들어가야 하는데, 지금까지 팀원용 SSH 계정은 `dbclient`(DB 전용)뿐이라 백엔드 개발자가 로그를 볼 방법이 없었다. `dbclient`와 같은 패턴(제한 계정 + forced command)으로 로그 조회 전용 계정 `logviewer`를 추가한다.

```
                     likelion-oci 서버
              infra/logs/{stage,prod}/*.log (world-readable, 644)
                            ▲
                     ┌──────┴──────┐
                     │  logviewer   │
                     │ (팀원, forced │
                     │  command)    │
                     └──────┬──────┘
                            │
                logsearch-guard.sh 경유
                requestId(UUID)로만 검색 가능
                (파일 지정·범용 grep 불가)
```

**`dbclient`와 역할이 안 겹치는 이유**: `dbclient`는 SQL을 직접 실행하는 CLI(조회+DML)라 셸 탈출 위험을 막는 게 핵심 관심사였다. `logviewer`는 애초에 임의 명령을 실행할 여지가 있는 도구(sqlite3 같은)를 안 거치고 `grep` 결과만 돌려주는 순수 조회 도구라 셸 탈출 위험 자체가 없다 — 대신 검색어를 요청ID(UUID) 형식으로만 제한해서, "로그 파일 전체를 뒤지는 범용 grep 도구"가 되지 않게 좁혀뒀다(다른 사람 요청 로그를 무차별로 훑는 걸 방지).

---

## 접속 방법

```bash
ssh logviewer@호스트 "stage <requestId>"    # stage 로그에서 검색
ssh logviewer@호스트 "prod <requestId>"     # prod 로그에서 검색
```

`requestId`는 응답 헤더 `X-Request-Id` 값(UUID) 그대로. 형식이 안 맞거나 `stage`/`prod`가 아니면 사용법 안내만 나오고 끝난다. 일치하는 로그가 없으면 "일치하는 로그가 없습니다"만 반환한다(로그 보관 기간 30일이 지났거나, 아직 배포 전 요청일 수 있음).

## 팀원 온보딩 (logviewer에 공개키 추가)

**신선우·안시현은 이미 `dbclient`에 공개키가 등록돼 있어 새로 만들 필요 없이 그 키를 재활용한다** — 재활용 전 본인에게 "이 키 로그 조회에도 같이 써도 되냐"만 확인.

장찬욱이 서버에서 등록:
```bash
echo 'command="/home/ubuntu/website/infra/scripts/logsearch-guard.sh",no-pty,no-agent-forwarding,no-X11-forwarding,no-port-forwarding,no-user-rc ssh-ed25519 AAAA...받은공개키... 이름' \
  | sudo tee -a /home/logviewer/.ssh/authorized_keys
```

**주의 — bare 명령이 아니라 반드시 `logsearch-guard.sh` 경유**: `dbclient-sqlite-guard.sh`가 그랬듯, forced command를 걸 땐 항상 검증 스크립트를 거쳐야 한다(직접 grep을 forced command로 걸면 `SSH_ORIGINAL_COMMAND`를 검증 없이 그대로 셸에 넘기는 구현이 되기 쉬워 위험).

**주의 — `logsearch-guard.sh`가 git에서 실행권한(+x) 없이 커밋되면 재배포마다 forced command가 조용히 죽는다**(`dbclient-sqlite-guard.sh`가 2026-07-24에 실제로 겪은 사고, `db-access.md` 참고): 반드시 `git ls-tree HEAD -- infra/scripts/logsearch-guard.sh`로 커밋된 모드가 `100755`인지 확인할 것.

**주의 — `/home/ubuntu` 통과 권한**: `dbclient`처럼 `logviewer`도 `/home/ubuntu`를 통과해야 `infra/logs/`까지 갈 수 있다. `chmod o+x /home/ubuntu`(전체 공개)로 열면 서버의 다른 로컬 계정(`opc` 등)까지 뚫려버리는 사고가 났던 적이 있어(`db-access.md` 참고), 반드시 계정 단위 ACL로만 좁힌다:
```bash
sudo setfacl -m u:logviewer:x /home/ubuntu
```
그 아래(`website/infra/logs/`, `infra/scripts/`)는 이미 `rwxr-xr-x`/`rw-r--r--`로 전체 공개 상태라 별도 권한 작업 불필요(로그 파일 자체가 개인정보를 마스킹해 남기므로 — `LogMasker`, `backend/SECURITY.md` — 읽기 권한을 넓게 둬도 괜찮다고 판단).

**현재 등록 상태(2026-08-03 서버 실측)**: 안시현(키 2개), 신선우 — `dbclient`에 등록돼 있던 기존 키 재활용. 계정(`useradd -s /bin/bash`, nologin이 아닌 이유는 아래 참고) 생성 + `/home/ubuntu` ACL(`setfacl -m u:logviewer:x`) + 더미 UUID로 동작 검증(정상 형식은 grep 시도 후 "일치하는 로그 없음", 비정상 형식은 즉시 차단)까지 완료. 실제 요청 ID로 찾아지는 로그는 #404가 `dev`에 머지·배포된 뒤부터 생긴다.

**주의 — 계정 셸을 `/usr/sbin/nologin`으로 만들면 안 된다**: forced command(`authorized_keys`의 `command=`)는 sshd가 그 계정의 로그인 셸을 통해 실행한다 — 셸 자체가 `nologin`이면 어떤 명령이 오든 무시하고 즉시 거부해버려서 forced command 자체가 통째로 동작 안 한다(실제로 처음 이렇게 만들었다가 겪음). `dbclient`와 마찬가지로 `/bin/bash`여야 한다 — 보안은 셸을 막는 게 아니라 `command=` 강제 + `no-pty`(대화형 세션 차단) 조합으로 확보된다.

---

## 한계

- 30일 지난 로그는 `cleanup-old-logs.sh`가 지워서 검색 안 됨(디스크 알람과 트레이드오프, `observability.md` 참고).
- Security가 401/403으로 끝내는 요청은 헤더는 붙지만 그 경로에 로깅 코드가 없어 지금은 검색해도 안 나온다(`logging.md` 참고 — 나중에 그 로깅이 추가되면 이 계정으로 그대로 찾아진다).
- `@Async`로 넘어가는 작업(이메일 발송 등)도 같은 requestId를 달고 있어 검색되지만, 여러 줄이 나올 수 있다(예: 구독자 100명 발송이면 100줄) — 의도된 동작(`backend` PR #404 본문 참고).
