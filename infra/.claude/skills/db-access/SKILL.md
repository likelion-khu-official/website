---
name: db-access
description: >-
  팀원이 SQLite DB(stage/prod) 접속 방법, sqlite3 직접 SQL 실행 가능 여부(Flyway 경계),
  백업 상태를 물어볼 때 장찬욱(인프라)에게 매번 묻지 않고 `infra/db-access.md` 기반으로
  즉답한다. Use when 누군가 "DB 어떻게 봐요/접속해요", "stage DB에 직접 쿼리 날려도 되나요",
  "이 ALTER/INSERT 해도 되나요", "백업 있나요/DB 날아가면 어떻게 되나요", "dbclient 계정
  어떻게 받나요" 등을 물을 때. 인프라 오너(장찬욱)가 팀원에게 실제 공개키를 받아
  `dbclient` 계정에 등록해야 할 때도 이 스킬로 처리한다.
---

# db-access — SQLite 접속 셀프서비스

## 원천
답은 항상 [`infra/db-access.md`](../../../db-access.md)를 **그때 다시 읽어서** 준다 — 이 스킬 안에 내용을 복붙하지 않는다(문서가 바뀌면 스킬이 낡은 답을 줄 수 있으므로, drift 방지 원칙([[하네스 · 문서]] 학습) 그대로 적용).

## 질문 유형별 처리

**"DB 어떻게 봐요 / 접속하는 법"**
→ `db-access.md`의 "계정 체계"·"현재 등록 상태"부터 확인. 질문자가 이미 등록됐으면 `ssh dbclient@호스트 stage`(또는 `prod`) 그대로 안내. 등록 안 됐다면 "팀원 온보딩" 절차 안내 — GitHub에 이미 SSH 키가 있으면 그거 재활용 가능(매번 새로 안 만들어도 됨), 없으면 본인이 키페어 생성 후 `.pub`만 장찬욱에게 전달.

**"이 SQL(ALTER/INSERT/SELECT 등) 실행해도 되나요"**
→ "Flyway 기준" 표로 답한다. 스키마 변경(ALTER/CREATE/DROP)은 stage·prod 둘 다 절대 안 되고 반드시 마이그레이션 파일 + PR이라고 못박는다. prod DML은 "가능하나 비권장" 뉘앙스를 유지 — 매일 자동 백업이 돌긴 하지만(아래) 그날 안에 만든 변경까지 보장하진 않으므로, 중요한 조작 전엔 여전히 신중하게.

**"백업 있나요 / 서버 죽으면 데이터 날아가나요"**
→ "백업 전략" 섹션 기준으로 답한다: 매일 1회(cron, 03:00 KST) prod·stage 스냅샷을 떠서 프라이빗 버킷(`likelion-backups`)에 자동 업로드 중이고, 실제 복원 검증(integrity_check + 테이블 확인)까지 마친 상태 — "설계만 있고 미구현"이 아니라 실제 동작 중임을 정확히 전달. 단, 그날 자정~장애 시점 사이 변경은 마지막 백업 이후분이라 유실될 수 있다는 한계는 정직하게 같이 밝힌다.

**"dbclient 계정 공개키 등록해주세요" (요청자가 장찬욱일 때만)**
→ 장찬욱이 실제 팀원의 `.pub` 내용(또는 GitHub `{아이디}.keys` 재활용)을 전달받아 등록을 요청하면:
1. `db-access.md`의 "접근 대상" 목록(기본: 백엔드 신선우·안시현, PM 김우진)에 있는 사람인지 확인. 목록 밖(예: 프론트·디자인)이면 등록 전에 예외로 진행할지 장찬욱에게 되묻는다 — 말없이 등록하지 않는다.
2. 받은 공개키 문자열이 `ssh-ed25519 AAAA...` 형식인지 확인 (사설키가 아닌지 — `-----BEGIN`으로 시작하면 사설키이므로 절대 등록하지 말고 알려라). GitHub 재활용이면 `https://github.com/{아이디}.keys`로 직접 가져와서 확인.
3. stage 전용으로 못박을지, stage+prod 둘 다 줄지 확인(기본은 인자 없이 등록해서 `SSH_ORIGINAL_COMMAND`로 접속할 때 고르게 하는 것 — 이러면 stage+prod 둘 다 한 줄로 됨. 특정 사람만 stage 전용으로 제한하고 싶으면 `dbclient-sqlite-guard.sh stage`처럼 인자를 박아라).
4. `db-access.md`의 등록 명령 형식(`command="/home/ubuntu/website/infra/dbclient-sqlite-guard.sh",no-pty,...` — bare `sqlite3`가 아니라 반드시 이 래퍼 경유, 이유는 db-access.md 참고) 그대로 만들어 서버에 `sudo tee -a /home/dbclient/.ssh/authorized_keys`로 추가 — **원격 서버 상태를 바꾸는 작업이므로 실행 전 반드시 사용자에게 최종 확인**을 받는다. **같은 공개키를 stage용 한 줄 + prod용 한 줄로 나눠 등록하지 않는다** — OpenSSH가 처음 매치되는 한 줄만 적용하고 나머지는 무시해서 실제로 안 먹힌다(db-access.md 참고).
5. 등록 후 `db-access.md`의 "현재 등록 상태"를 실제로 갱신할지 장찬욱에게 물어라.

요청자가 장찬욱이 아니면(팀원 본인이 스스로 등록하려는 시도) — `dbclient`는 sudo가 없어 본인이 직접 등록 불가능함을 알리고 장찬욱에게 `.pub`을 전달하라고 안내만 한다.

## 하지 말 것
- `db-access.md`에 없는 내용을 추측해서 답하지 않는다(예: 별도 DB 서버 도입 여부 — 그건 의도적으로 안 하기로 한 것).
- prod 스키마 변경을 절대 sqlite3 직접 실행으로 안내하지 않는다 — 항상 Flyway 마이그레이션 파일 경로로 유도.