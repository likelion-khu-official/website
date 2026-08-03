---
name: log-access
description: >-
  팀원이 서버 로그(요청 ID로 원인추적) 접속 방법을 물어보거나, 자기 요청/버그의 로그를
  찾아달라고 요청할 때 장찬욱(인프라)에게 매번 묻지 않고 `infra/docs/log-access.md` 기반으로
  즉답한다. Use when 누군가 "이 요청 로그 좀 봐줘", "X-Request-Id로 로그 찾아줘", "서버 로그
  어떻게 봐요", "logviewer 계정 어떻게 받나요", "이 에러 서버에서 뭐 때문에 났는지 로그 확인해줘"
  등을 물을 때. 인프라 오너(장찬욱)가 팀원에게 실제 공개키를 받아 `logviewer` 계정에 등록해야
  할 때도 이 스킬로 처리한다.
---

# log-access — 요청 ID 기반 로그 조회 셀프서비스

## 원천

답은 항상 [`infra/docs/log-access.md`](../../docs/log-access.md)를 **그때 다시 읽어서** 준다 — 이 스킬 안에 내용을 복붙하지 않는다(문서가 바뀌면 스킬이 낡은 답을 줄 수 있으므로 drift 방지).

## 질문 유형별 처리

**"서버 로그 어떻게 봐요 / X-Request-Id로 조회하는 법"**
→ `log-access.md`의 "접속 방법"부터 확인. 질문자가 이미 등록됐으면 `ssh logviewer@호스트 stage`(또는 `prod`) + requestId 그대로 안내. 등록 안 됐다면 "팀원 온보딩" 절차 안내 — `dbclient`에 이미 등록된 키가 있으면 그거 재활용 가능(매번 새로 안 만들어도 됨), 없으면 본인이 키페어 생성 후 `.pub`만 장찬욱에게 전달.

**"이 요청/버그 로그 좀 찾아줘" (등록된 팀원이 실제 조회를 요청할 때)**
→ 팀원은 SSH 명령을 직접 안 치고 본인 Claude Code(이 레포를 체크아웃한 환경이면 이 스킬을 자동으로 인식함)한테 요청하는 게 기본 사용법이다. 요청받으면:
1. 요청자가 `X-Request-Id` 값(UUID)을 갖고 있는지 확인 — 없으면 브라우저 개발자도구(Network 탭)에서 문제가 된 요청의 응답 헤더에서 복사하는 방법을 안내한다.
2. `log-access.md`의 "현재 등록 상태"로 요청자가 실제 등록됐는지 확인(모르면 직접 SSH 시도해보면 인증 실패로 바로 드러난다 — 등록 안 됐으면 장찬욱에게 등록부터 요청하라고 안내).
3. `ssh logviewer@168.138.202.82 "<stage|prod> <requestId>"`를 실행한다. 어느 환경(stage/prod)인지 모르면 먼저 물어본다.
4. 결과를 그대로 요청자에게 전달한다 — 가공·요약만 하지 말고 실제 로그 줄을 보여줘야 확인이 된다. "일치하는 로그가 없습니다"가 나오면 `log-access.md`의 "한계"(30일 보관, 401/403엔 로깅 없음 등)를 같이 안내해서 왜 없는지 짐작할 수 있게 한다.

**"logviewer 계정 등록해주세요" (요청자가 장찬욱일 때만)**
→ 장찬욱이 실제 팀원의 `.pub` 내용(또는 `dbclient`에 이미 등록된 키 재활용)을 전달받아 등록을 요청하면:
1. 받은 공개키 문자열이 `ssh-ed25519 AAAA...` 형식인지 확인(사설키가 아닌지 — `-----BEGIN`으로 시작하면 사설키이므로 절대 등록하지 말고 알려라).
2. `log-access.md`의 등록 명령 형식(`command="/home/ubuntu/website/infra/scripts/logsearch-guard.sh",no-pty,...`) 그대로 만들어 서버에 `sudo tee -a /home/logviewer/.ssh/authorized_keys`로 추가 — **원격 서버 상태를 바꾸는 작업이므로 실행 전 반드시 사용자에게 최종 확인**을 받는다.
3. `logsearch-guard.sh`가 git에 `100755`로 커밋돼 있는지(`git ls-tree HEAD -- infra/scripts/logsearch-guard.sh`) 먼저 확인 — 아니면 재배포 때 forced command가 조용히 죽는다(`dbclient-sqlite-guard.sh`가 실제로 겪은 사고, `db-access.md`·`log-access.md` 참고).
4. `logviewer` 계정 자체가 처음이면(서버에 아직 생성 안 됐으면) `sudo useradd -m -s /bin/bash logviewer` + `sudo setfacl -m u:logviewer:x /home/ubuntu`(전체 공개 `chmod o+x`가 아니라 반드시 계정 단위 ACL — 이유는 `log-access.md` 참고)까지 같이 안내·확인. **셸을 `/usr/sbin/nologin`으로 만들지 말 것** — forced command는 그 계정의 로그인 셸을 통해 실행되는데 셸이 nologin이면 어떤 명령이 와도 무시하고 거부해버려서 forced command 자체가 안 먹힌다(실제로 겪은 함정, `log-access.md` "현재 등록 상태" 참고). 보안은 셸이 아니라 `command=` 강제 + `no-pty`로 확보된다.
5. 등록 후 `log-access.md`의 "현재 등록 상태"를 실제로 갱신할지 장찬욱에게 물어라.

요청자가 장찬욱이 아니면(팀원 본인이 스스로 등록하려는 시도) — 본인이 직접 등록 불가능함을 알리고 장찬욱에게 `.pub`을 전달하라고 안내만 한다.

## 하지 말 것

- `log-access.md`에 없는 내용을 추측해서 답하지 않는다.
- `logsearch-guard.sh`를 거치지 않는 방식(직접 `ssh ubuntu@host grep ...` 등)을 팀원에게 안내하지 않는다 — `ubuntu` 계정 키는 인프라 오너 전용이라 다른 팀원에게 공유하지 않는다(`db-access.md`와 동일 원칙).
- 검색어(requestId)가 UUID 형식이 아닌 자유 검색을 대신 실행해주지 않는다 — 그 용도(로그 전체 탐색)가 필요하면 장찬욱에게 직접 요청하도록 안내(이 계정의 의도된 제약).
