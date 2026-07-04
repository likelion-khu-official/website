# DB 접속 — 사용법 · 허용선 · 백업 전략

> 인프라 문서. 배경은 [`db-migration.md`](./db-migration.md) 참고.

## 왜 이 문서가 필요한가

DB가 SQLite 파일이라 **원격 DB 서버·포트가 없다.** TablePlus·DBeaver 같은 GUI 클라이언트로 직접 붙는 게 불가능하고, SSH로 서버에 들어가서 파일을 여는 방법뿐이다. 이 경로와 "여기까진 되고 여기부턴 안 됨"을 팀원이 매번 물어보지 않도록 정리.

**별도 DB 서버(Postgres 전환 등)로 안 가는 이유:** 지금 규모(팀 8명, 홍보 사이트)에서는 과함. 포트를 새로 열면 공격 표면만 늘어난다. 병목은 서버가 아니라 SSH 키 배포(팀원별 접근 권한) — 이건 PM 결정 사항.

---

## 접속 방법

```bash
ssh likelion-oci                                    # 로컬 ~/.ssh/config에 등록돼 있으면
sqlite3 /home/ubuntu/website/infra/data/stage.db    # 또는 prod.db — dbaccess 그룹이면 sudo 불필요
```

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

키페어는 **팀원 본인이 자기 기기에서 생성**한다. 개인키는 만든 기기를 벗어나면 안 되므로 장찬욱이 대신 만들어주지 않는다.

1. 팀원이 본인 기기에서:
   ```bash
   ssh-keygen -t ed25519 -C "이름@likelion"
   ```
   `~/.ssh/id_ed25519`(개인키, 보관만) / `~/.ssh/id_ed25519.pub`(공개키, 이것만 전달) 생성됨.
2. 팀원이 `.pub` 파일 내용을 장찬욱에게 전달(카톡 등).
3. 장찬욱이 서버에서:
   ```bash
   echo 'command="/home/ubuntu/website/infra/dbclient-sqlite-guard.sh /home/ubuntu/website/infra/data/stage.db",no-pty,no-agent-forwarding,no-X11-forwarding,no-port-forwarding,no-user-rc ssh-ed25519 AAAA...받은공개키... 이름' \
     | sudo tee -a /home/dbclient/.ssh/authorized_keys
   ```

**주의 — bare `sqlite3`를 forced command로 쓰지 않는다:** `command="sqlite3 /path/db"`처럼 sqlite3를 직접 지정하면, sqlite3 CLI가 stdin으로 `.shell`/`.system` 같은 dot-command를 받아 임의 OS 명령을 실행할 수 있다 — `no-pty`는 pty 할당만 막을 뿐 이 입력 자체는 막지 못해서, 그 순간 dbclient 키를 가진 사람이 셸을 얻는다(2026-07-04 보안 점검에서 발견, 등록된 키가 아직 없어 실제 악용 전에 수정). 그래서 forced command는 sqlite3가 아니라 [`dbclient-sqlite-guard.sh`](./dbclient-sqlite-guard.sh)를 가리켜야 한다 — dot-command와 `ATTACH DATABASE`를 걸러낸 뒤에만 sqlite3로 넘기는 래퍼다. prod 조회가 필요한 사람은 `stage.db`를 `prod.db`로 바꿔서 별도 줄로 추가(계정당 여러 줄 가능, 목적별로 나눠 등록 권장).

지금은 `dbclient` 계정만 만들어뒀고 등록된 공개키는 없다 — 실제 팀원 키가 오면 위 방식으로 추가.

---

## Flyway 기준 — 해도 되는 것 / 하면 안 되는 것

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
