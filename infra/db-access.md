# DB 접속 — 사용법 · 허용선 · 백업 전략

> 인프라 문서. 배경은 [`db-migration.md`](./db-migration.md) 참고.

## 왜 이 문서가 필요한가

DB가 SQLite 파일이라 **원격 DB 서버·포트가 없다.** TablePlus·DBeaver 같은 GUI 클라이언트로 직접 붙는 게 불가능하고, SSH로 서버에 들어가서 파일을 여는 방법뿐이다. 이 경로와 "여기까진 되고 여기부턴 안 됨"을 팀원이 매번 물어보지 않도록 정리.

**별도 DB 서버(Postgres 전환 등)로 안 가는 이유:** 지금 규모(팀 8명, 홍보 사이트)에서는 과함. 포트를 새로 열면 공격 표면만 늘어난다. 병목은 서버가 아니라 SSH 키 배포(팀원별 접근 권한) — 이건 PM 결정 사항.

---

## 접속 방법

**인프라 오너(`ubuntu`):**
```bash
ssh likelion-oci                                    # 로컬 ~/.ssh/config에 등록돼 있으면
sqlite3 /home/ubuntu/website/infra/data/stage.db    # 또는 prod.db — dbaccess 그룹이면 sudo 불필요
```

**제한 계정(`dbclient`) — 팀원용:**
```bash
ssh dbclient@호스트 stage    # stage.db로 접속
ssh dbclient@호스트 prod     # prod.db로 접속
```
`stage`/`prod` 외의 값이나 인자 없이 접속하면 사용법 안내만 나오고 끝난다(아래 "온보딩" 참고).

**파일 소유권 (2026-07-03 정리함):** DB 파일은 `root:dbaccess`, 권한 `660`(그룹 rw, other 없음). `data/` 디렉터리는 `2770`(setgid — 컨테이너가 파일을 새로 만들어도 그룹은 `dbaccess`로 상속). `dbaccess` 그룹 멤버면 `sudo` 없이 읽기·쓰기 둘 다 가능 — **읽기/쓰기 그룹을 분리하진 않았다** (지금 인원 규모에 ACL까지 나누는 건 과설계로 판단, 필요해지면 `setfacl`로 추가).

**주의 — 파일이 삭제·재생성되면 권한이 되돌아간다:** 컨테이너는 root로 뜬다. 지금 있는 두 파일(`stage.db`/`prod.db`)은 이미 존재해서 앱이 열기만 하고 mode를 안 바꾸지만, 볼륨이 밀리거나 파일이 삭제된 뒤 컨테이너가 새로 만들면 다시 `root:root` 644로 돌아간다 — 그럴 땐 아래 3번 명령을 재실행.
```bash
sudo chgrp dbaccess /home/ubuntu/website/infra/data/*.db
sudo chmod 660 /home/ubuntu/website/infra/data/*.db
```

**주의 — 동시 쓰기:** SQLite는 라이터(writer) 락이 하나뿐이다. 백엔드 앱이 마침 쓰는 중이면 수동 쓰기가 잠깐 블록되거나 `database is locked` 에러가 날 수 있다. 짧게 붙었다 빠지는 정도면 문제없음.

**계정 체계:**
- `ubuntu` — 인프라 오너(장찬욱) 전용, sudo 있음(서버 전체 관리). 다른 팀원에게 이 계정 키를 나눠주지 않는다 — 키 하나 유출 시 블라스트 반경이 서버 전체라서.
- `dbclient` — DB 접근 전용 제한 계정. **sudo 없음**, `dbaccess` 그룹만 소속. DB 파일 밖에는(비밀번호 로그인 자체가 잠겨 있고 `.env.*`는 소유자만 읽기라 dbclient는 접근 불가) 만질 게 없음.

**접근 대상 (2026-07-04 결정):** 필요한 사람에게만 — 늘어날수록 유출 시 blast radius가 늘어나므로 최소권한.
- **백엔드(신선우, 안시현)** — 기본 대상. 스키마 확인·디버깅에 DB 직접 조회가 실무상 필요.
- **PM(김우진)** — 기본 대상. PM 책임 중 "콘텐츠 수급"(구독자 수·피드 글 등 실 데이터 확인)에 실제로 필요.
- **프론트(박일하, 김현정)** — 기본 대상 아님. 프론트는 서버사이드 rewrite 프록시로 API만 거쳐 백엔드에 접근하는 구조라, DB를 직접 볼 구조적 이유가 없다. 구체적 디버깅 니즈가 생기면 그때 개별로 예외 등록(일단 다 열고 나중에 좁히기보다 안전).
- **디자인(김영웅, 유한솔)** — GitHub 계정도 없어 논외.

위 "기본 대상" 밖의 사람이 키 등록을 요청하면, 장찬욱에게 예외 여부를 확인한 뒤에만 진행한다.

**팀원 온보딩 (dbclient에 공개키 추가):**

키페어는 **팀원 본인 소유**여야 한다(개인키는 만든 기기를 벗어나면 안 됨). 두 경로 중 하나:
- **이미 GitHub에 SSH 키를 등록해 쓰고 있으면 그걸 재활용** — `https://github.com/{아이디}.keys`로 공개키만 가져오면 된다(공개키는 원래 공개해도 안전한 값). 매번 새로 키를 만들 필요 없이 이 경로가 마찰이 적다. 재활용 전 본인에게 "이 키 db 접근에도 같이 써도 되냐"만 확인.
- 없으면 팀원이 본인 기기에서 새로 생성: `ssh-keygen -t ed25519 -C "이름@likelion"` → `.pub` 내용만 장찬욱에게 전달(카톡 등).

장찬욱이 서버에서 등록:
```bash
echo 'command="/home/ubuntu/website/infra/dbclient-sqlite-guard.sh",no-pty,no-agent-forwarding,no-X11-forwarding,no-port-forwarding,no-user-rc ssh-ed25519 AAAA...받은공개키... 이름' \
  | sudo tee -a /home/dbclient/.ssh/authorized_keys
```
`command=`에 db 경로를 안 박아두면, 접속할 때 `ssh dbclient@호스트 stage`/`prod`로 그때그때 골라서 stage+prod 둘 다 한 줄로 접근 가능(아래 "주의" 참고). 특정 사람을 stage 전용으로 못박고 싶으면 `dbclient-sqlite-guard.sh stage`처럼 인자를 명시.

**주의 — bare `sqlite3`를 forced command로 쓰지 않는다:** `command="sqlite3 /path/db"`처럼 sqlite3를 직접 지정하면, sqlite3 CLI가 stdin으로 `.shell`/`.system` 같은 dot-command를 받아 임의 OS 명령을 실행할 수 있다 — `no-pty`는 pty 할당만 막을 뿐 이 입력 자체는 막지 못해서, 그 순간 dbclient 키를 가진 사람이 셸을 얻는다(2026-07-04 보안 점검에서 발견, 등록된 키가 아직 없어 실제 악용 전에 수정). 그래서 forced command는 sqlite3가 아니라 [`dbclient-sqlite-guard.sh`](./dbclient-sqlite-guard.sh)를 가리켜야 한다 — dot-command·`ATTACH DATABASE`·스키마 변경을 걸러낸 뒤에만 sqlite3로 넘기는 래퍼다.

**주의 — 같은 공개키를 여러 줄(stage용 한 줄, prod용 한 줄) 등록해서 둘 다 주려던 이전 방식은 실제로 동작 안 한다:** OpenSSH는 같은 공개키가 `authorized_keys`에 여러 줄이면 처음 매치되는 한 줄만 적용하고 나머지는 무시한다(2026-07-04 실측 확인). 그래서 지금은 `command=`에 db 경로를 고정하지 않고, 스크립트가 `SSH_ORIGINAL_COMMAND`(클라이언트가 `ssh dbclient@host stage`처럼 요청한 값)로 stage/prod를 선택한다 — 한 줄로 충분.

**주의 — `dbclient-sqlite-guard.sh`가 git에서 실행권한(+x) 없이 커밋되면, 재배포 때마다 forced command가 조용히 `Permission denied`로 죽는다(2026-07-24 실제 발생):** 등록된 키를 가진 팀원 전원이 접속 시도 시 pubkey 인증은 성공하고 세션도 열리는데, forced command exec 단계에서 즉시 disconnect되는 증상이었다. 원인은 두 가지가 겹쳐 있었다:
1. `dbclient-sqlite-guard.sh`가 git에 `100644`(비실행)로 커밋돼 있었음 — 서버에서 과거 누군가 수동으로 걸어둔 `chmod +x`가 있었을 수 있지만, 그 뒤 재체크아웃(`git pull`/재배포)이 한 번이라도 지나가면 git이 기억하는 644로 조용히 되돌아간다. **`backup-db.sh`에서 이미 07-13에 겪은 것과 완전히 같은 패턴**(`pm/docs/learnings.md` 참고) — cron이 아니라 SSH forced command가 실행 주체였을 뿐, "서버에 지금 실행권한이 있다는 사실이 git에도 그렇게 기록돼 있다는 뜻은 아니다"는 교훈이 여기도 그대로 적용됨.
2. `/home/ubuntu` 자체 권한 확인 중, `dbclient`에게 통과(traverse) 권한이 이미 **개별 ACL**(`setfacl -m u:dbclient:x /home/ubuntu` 방식, `user:dbclient:--x`)로 걸려 있는 걸 뒤늦게 발견했다 — 즉 디렉터리 통과는 원래부터 문제가 아니었다. 진단 중 실수로 `chmod o+x /home/ubuntu`(전체 other 대상)를 걸었다가, 그 결과로 `dbclient`뿐 아니라 서버의 다른 로컬 계정(`opc`)까지 `/home/ubuntu`를 통과할 수 있게 될 뻔했다 — 정확히 [`pm/docs/learnings.md`](../pm/docs/learnings.md)에 이미 기록된 "`chmod o+x`는 형제 디렉터리까지 다 뚫는다" 사고를 그대로 재현할 뻔한 것. `chmod o-x`로 즉시 되돌리고 기존 ACL만 남겨 최소권한을 유지했다.

**수정:** 서버에서 `sudo chmod 755 dbclient-sqlite-guard.sh` + 레포에 `git update-index --chmod=+x infra/dbclient-sqlite-guard.sh`로 실행권한을 **git 트리 자체에 커밋** — 다음 재배포부터는 체크아웃이 벗겨내지 못한다. → forced command로 쓰는 스크립트를 새로 추가하거나 수정할 때는 항상 `git ls-tree HEAD -- <path>`로 커밋된 모드가 `100755`인지 확인할 것. 그리고 제한 계정에 상위 디렉터리 접근을 열어줄 땐 `chmod o+x`(전체 공개) 전에 반드시 `getfacl`로 이미 걸린 개별 ACL이 없는지 먼저 확인 — 있다면 그걸로 충분한지부터 보고, 새로 열더라도 `setfacl -m u:계정:x`로 계정 단위로만 좁힐 것.

**현재 등록 상태(2026-07-04):** 안시현(키 2개 모두 등록), 김우진(PM) — stage+prod 조회+작성 등록 완료. 신선우는 GitHub에 등록된 SSH 키가 없어 아직 미등록(본인이 키 생성 후 `.pub` 전달 대기 중).

---

## GUI 뷰어 (sqlite-web) — 조회 전용, dbclient CLI와 함께 쓰기

**목적:** `dbclient` CLI는 결과가 터미널 텍스트로만 나와서 스키마·데이터를 훑어보기 불편하다. 백엔드 개발자가 "참고용으로 보기 좋게" 볼 수 있도록 read-only 웹 GUI([sqlite-web](https://github.com/coleifer/sqlite-web))를 별도 경로로 추가했다. **조작(INSERT/UPDATE/DELETE)은 여전히 `dbclient` CLI로만** — GUI는 보기 전용이다.

**계정을 분리한 이유:** sqlite-web 같은 범용 GUI 도구는 "DML은 되고 DDL은 안 되고" 같은 문장 단위 구분을 못 한다(전체 read-only냐 read-write냐 둘 중 하나). `dbclient`가 힘들게 갖춘 DDL 차단(`ALTER`/`CREATE`/`DROP` 금지)을 GUI에도 그대로 얹으려면 sqlite-web 자체를 포크해서 같은 차단 로직을 또 심어야 하는데, 그러면 차단 로직이 두 군데(bash wrapper + 포크한 Python)에 중복돼 한쪽만 고치고 한쪽을 놓치는 사고 위험이 생긴다. 그래서 GUI는 아예 **전체 read-only**로만 열고(`-r` 플래그 + `:ro` 볼륨 마운트 이중 방어), 조작은 기존 `dbclient` 경로를 그대로 쓰게 분리했다.

**구성:**
- `docker-compose.yml`의 `sqlite-web-stage`(포트 8090)·`sqlite-web-prod`(포트 8091) 서비스 — `127.0.0.1`에만 바인딩(공인 포트 아님, OCI Security List 변경 없음).
- 전용 SSH 계정 `dbtunnel` — **셸 없음(`nologin`)**, `dbaccess` 그룹 소속 아님(DB 파일에 직접 손 안 댐), `permitopen="127.0.0.1:8090"`/`"127.0.0.1:8091"`로 포워딩 대상을 그 두 포트로만 제한. `dbclient`의 `no-port-forwarding`과 정반대로 "포워딩만 되고 그 외엔 아무것도 안 되는" 계정이다.
- 개발자는 `ssh -L 8090:127.0.0.1:8090 dbtunnel@호스트`로 터널을 열고 브라우저에서 `http://127.0.0.1:8090` 접속.
- 로컬 스킬 [`infra/db-dev-ui.sh`](./db-dev-ui.sh)가 tmux로 "조회(터널)"+"조작(dbclient CLI)" 두 세션을 한 창(분할 pane)에 띄운다 — 서버 쪽 권한 모델은 안 건드리고 화면만 합친 것. 사용법: `infra/db-dev-ui.sh stage` 또는 `prod`. tmux가 없으면(Windows, WSL 미설치) Windows Terminal(`wt.exe`) 분할로 대체하거나, 그것도 없으면 두 명령을 안내만 하고 끝난다.
- **두 세션은 서로 독립이다** — `dbtunnel` 터널을 먼저 열어야 `dbclient` CLI가 열리는 게 아니라, 완전히 별개의 SSH 인증(각자 다른 키)으로 동시에 붙는 것뿐이다.

**`dbtunnel` 계정 생성 (서버에서 인프라 오너가 직접 실행 — Claude에게 자동화 안 시킴, 공유 서버에 새 SSH 접근 수단을 만드는 일이라 사람이 직접):**
```bash
sudo useradd -m -s /usr/sbin/nologin -c "sqlite-web tunnel-only account" dbtunnel
sudo mkdir -p /home/dbtunnel/.ssh
sudo chmod 700 /home/dbtunnel/.ssh
sudo chown dbtunnel:dbtunnel /home/dbtunnel/.ssh
```
팀원 공개키 등록 (`dbclient`와 동일한 공개키 재활용 — 같은 사람이 조회+조작 둘 다 하므로):
```bash
echo 'command="echo tunnel-only-account",no-pty,no-agent-forwarding,no-X11-forwarding,no-user-rc,permitopen="127.0.0.1:8090",permitopen="127.0.0.1:8091" ssh-ed25519 AAAA...받은공개키... 이름' \
  | sudo tee -a /home/dbtunnel/.ssh/authorized_keys
sudo chmod 600 /home/dbtunnel/.ssh/authorized_keys
sudo chown dbtunnel:dbtunnel /home/dbtunnel/.ssh/authorized_keys
```
**접근 대상은 `dbclient`와 동일** — 기본: 백엔드(신선우·안시현) + PM(김우진). `dbclient` 등록 시 같이 등록.

**배포(컨테이너 기동, 인프라 오너가 직접 — infra/ 변경은 CD paths 필터 밖이라 자동 배포 안 됨):**
```bash
cd /home/ubuntu/website/infra
docker compose up -d sqlite-web-stage sqlite-web-prod
```

**주의 — 이 PR은 `dev`와 `main` 양쪽에 다 들어가야 안전하다.** CD의 `git checkout -f $TARGET_BRANCH`는 stage/prod 구분 없이 서버의 같은 워킹 디렉터리 하나를 공유한다(2026-07-24 dbclient forced command 사고에서 실측). `docker-compose.yml` 변경을 `dev`에만 머지하면, 다음 `main` 배포(prod 백엔드 머지) 때 `git checkout -f main`이 이 서비스 정의가 없는 예전 `docker-compose.yml`로 조용히 되돌린다 — 컨테이너 자체는 계속 떠 있어도, 이후 `docker compose up -d`를 다시 돌리는 순간 정의가 사라진 걸로 취급될 수 있다. `dev`에 머지되면 되도록 빨리 `main`으로도 승격할 것.

---

## Flyway 기준 — 해도 되는 것 / 하면 안 되는 것

**현재 상태(2026-07-04 확인): 아직 Flyway 아니고 `ddl-auto: update`다.** 백엔드가 Flyway PR을 머지하기 전까지는, 앱이 재기동될 때마다 Hibernate가 엔티티 클래스를 보고 그때그때 스키마를 자동으로 맞춘다 — "머지된 마이그레이션만 한 번 적용"이 아니라 **재기동마다 매번** 일어난다(수동 재기동 포함). 아래 표·이유는 Flyway가 실제로 붙은 뒤를 기준으로 쓴 것이고, 진행 상황은 [`db-migration.md`](./db-migration.md)의 "진행 상황" 참고 — 인프라는 백엔드 Flyway PR 머지 타이밍에 맞춰 `.env.stage`/`.env.prod`를 수정할 예정으로 대기 중이다.

마이그레이션 파일 자체의 규칙은 [`db-migration.md`](./db-migration.md) 참고(`V{n}__설명.sql`, 머지된 파일 수정 금지). 여기는 **sqlite3로 직접 SQL 실행할 때** 기준.

| 작업 | stage | prod |
|---|---|---|
| 조회 (`SELECT`) | ✅ 자유 | ✅ 자유 |
| 데이터 조작 (`INSERT`/`UPDATE`/`DELETE`) | ✅ 테스트용으로 가능 | ⚠️ 가능하나 비권장 — 아래 참고 |
| 스키마 변경 (`ALTER`/`CREATE`/`DROP`) | ❌ | ❌ |

**❌는 문서상 금지가 아니라 [`dbclient-sqlite-guard.sh`](./dbclient-sqlite-guard.sh)가 기술적으로 차단한다** — `ubuntu` 계정(인프라 오너)은 이 제약이 없으니 필요하면 직접 sqlite3로 가능하지만, `dbclient`로는 세미콜론으로 이어 붙여도(`SELECT 1; DROP TABLE x;`) 우회 안 됨(2026-07-04 검증 완료).

**스키마 변경이 금지인 이유:** Flyway는 `db/migration/` 파일 이력만 보고 스키마를 추적한다. sqlite3로 직접 `ALTER TABLE` 등을 실행하면 Flyway 이력에는 안 잡히는 "숨은 변경"이 생긴다 — 다음에 진짜 마이그레이션 파일을 추가할 때 전제(현재 스키마)가 어긋나서 충돌하거나, stage가 리셋될 때(아래) 그 변경이 통째로 사라진다. 스키마 변경은 **반드시 새 `V{n}__설명.sql` 파일 + PR**로.

**stage에서 수동으로 넣은 건 영구적이지 않다:** `SPRING_FLYWAY_CLEAN_ON_VALIDATION_ERROR=true`라서, 머지된 마이그레이션 파일의 체크섬이 어긋나는 순간(그 파일을 누군가 사후 수정) Flyway가 stage DB를 통째로 지우고 처음부터 재적용한다. 이건 마이그레이션 파일 쪽 이벤트지 수동 SQL 실행 자체가 트리거는 아니지만, 결과적으로 "수동으로 넣어둔 데이터/스키마가 예고 없이 날아갈 수 있다"는 뜻 — stage에 뭘 심어두고 오래 의존하지 말 것.

**prod은 반대로 위험:** `SPRING_FLYWAY_CLEAN_DISABLED=true`라 clean 자체가 안 된다. 즉 자동 복구 장치가 없다 — 실수해도 되돌릴 방법이 백업뿐. 그래서 prod에 손대기 전엔 **반드시 아래 백업 먼저.**

---

## 백업 전략 (구현·검증 완료 — 2026-07-04)

**현재 상태:** 매일 자동 백업 동작 중. prod·stage 둘 다 대상.

**구성:**

1. **스냅샷 방식** — `cp` 대신 SQLite 내장 `.backup` 사용(쓰기 중에도 안전하게 일관된 스냅샷을 뜬다). 업로드 전 `PRAGMA integrity_check`로 스냅샷 자체가 깨지지 않았는지 확인 후에만 올린다. 스크립트: [`infra/backup-db.sh`](./backup-db.sh) + [`infra/backup_upload.py`](./backup_upload.py).
2. **주기** — 매일 1회, cron(`0 18 * * *` UTC = 03:00 KST, `ubuntu` 계정).
3. **보관 위치** — 별도 **프라이빗** OCI Object Storage 버킷 `likelion-backups` (기존 `likelion-stage`/`likelion-prod`는 Public이라 백업 부적합, 그래서 새로 만듦). 접근은 전용 IAM 그룹 `likelion-backup-writer` + 전용 서비스 계정(`backup-svc@likelion-khu.com`)의 Customer Secret Key로만 — 인프라 오너(Administrators) 계정 키는 안 씀(블라스트 반경 최소화).
4. **업로드는 aws-cli가 아니라 boto3로 한다** — aws-cli v2(awscrt 서명기)가 OCI S3 호환 엔드포인트에 대해 간헐적으로 `SignatureDoesNotMatch`를 내는 걸 실측으로 확인함(같은 자격증명·같은 명령이 방금 성공하고 바로 다음 호출에 실패, 반면 boto3 classic SigV4는 반복 테스트에서 안정적). `backup_upload.py`가 이 방식을 씀.
5. **보관 기간** — 로컬 최근 3일(`~/backups`) + 원격(버킷) 30일, 오래된 건 스크립트가 자동 rotation.
6. **검증** — 실제 업로드 후 원격에서 다시 내려받아 별도 경로에서 `PRAGMA integrity_check` + 테이블 목록 확인까지 완료(설계만이 아니라 복원까지 실증).

**자격증명:** 서버의 `infra/.env.backup`(git 제외, `chmod 600`)에 있음 — 템플릿은 [`infra/.env.backup.example`](./.env.backup.example).
