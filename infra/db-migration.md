# DB 마이그레이션 설계

> 인프라 맥락. 백엔드가 Flyway 붙일 때 이 문서 기준으로 맞춰 달라고 요청.

## 왜 이 설계인가

이슈 #21 요구사항:
- stage는 자유롭게 리셋 가능
- prod는 보호
- 개발팀은 "이렇게 올린다"만 알면 됨

Flyway + 환경별 설정이 이 셋을 동시에 만족한다.

---

## 개발팀 인터페이스 (할 일 전부)

```
backend/src/main/resources/db/migration/
  V1__init.sql
  V2__add_member_table.sql
  V3__add_blog_table.sql   ← 다음 변경
```

`V{숫자}__{설명}.sql` 파일 추가 → PR → 끝.
Flyway가 앱 기동 시 미적용 파일만 순서대로 실행한다. 개발팀이 배포 방법을 따로 알 필요 없다.

**규칙 하나:** 한 번 머지된 파일은 절대 수정하지 않는다. 체크섬으로 감지해서 에러 난다.

---

## Flyway 동작 방식

```
앱 기동
  → flyway_schema_history 테이블 없으면 생성
  → migration/ 폴더 SQL 파일 목록 읽기
  → 이미 적용된 것(history에 기록) 건너뜀
  → 미적용 파일만 순서대로 실행
  → 완료 → 앱 본격 시작
```

---

## 환경별 설정

### Stage (`.env.stage`)

```
SPRING_FLYWAY_CLEAN_ON_VALIDATION_ERROR=true
```

체크섬 불일치(마이그레이션 파일 수정 등) 감지 시 DB 전체 날리고 처음부터 재적용.
별도 리셋 스크립트 없어도 된다 — 백엔드가 스키마 갈아엎고 push하면 stage CD에서 자동 처리.

### Prod (`.env.prod`)

```
SPRING_FLYWAY_CLEAN_DISABLED=true
```

`clean` 자체가 코드 레벨에서 불가. 체크섬 불일치 시 앱 기동 실패 → CD 헬스체크 실패 → 자동 롤백.

---

## SQLite 제약 — 컬럼 변경 시 주의

SQLite는 `ALTER TABLE` 이 매우 제한적이다.

| 작업 | 가능 여부 |
|---|---|
| `ADD COLUMN` | ✅ |
| `DROP COLUMN` | ❌ |
| `RENAME COLUMN` | SQLite 3.25+ 만 |

컬럼 삭제·이름변경이 필요하면 테이블 재생성 패턴을 써야 한다.

```sql
-- 예: member 테이블에서 컬럼 삭제 or 이름 변경 시
CREATE TABLE member_new (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
INSERT INTO member_new SELECT id, name, email FROM member;
DROP TABLE member;
ALTER TABLE member_new RENAME TO member;
```

이 제약은 Flyway 문제가 아니라 SQLite 자체 제약이다.
Flyway는 이 SQL 그대로 실행해준다 — SQL만 제대로 쓰면 됨.

**실용적 판단:** 이 프로젝트는 홍보 사이트라 스키마가 한 번 잡히면 잘 안 바뀐다.
컬럼 변경이 필요한 상황은 드물고, 드문 경우엔 위 패턴으로 충분하다.
스키마 설계 초반에 신중하게 짜는 게 더 중요하다.

---

## 인프라가 할 일 (백엔드 Flyway 붙일 때)

1. `.env.stage` 에 `SPRING_FLYWAY_CLEAN_ON_VALIDATION_ERROR=true` 추가
2. `.env.prod` 에 `SPRING_FLYWAY_CLEAN_DISABLED=true` 추가
3. `application.yml` 에서 `ddl-auto: update` → `none` 으로 변경 요청 (백엔드 소관)

서버 재배포 없이 env 파일만 수정해도 되지만, `ddl-auto` 변경은 백엔드 코드 변경이라 CD가 돌아야 한다.

---

## 진행 상황 (2026-06-29)

백엔드(신선우)·인프라(장찬욱) 싱크 완료. 결론:

- **Flyway 사용 확정** — SQLite 지원 확인, 수동/Liquibase 대비 우리 규모에 맞음
- **경로 확인**: `backend/src/main/resources/db/migration/` (`classpath:db/migration`)
- **CI/CD paths 필터**: 기존 `backend/**`가 migration 폴더를 이미 포함 — 별도 추가 불필요
- **인프라 대기 중**: 백엔드 Flyway PR 머지 타이밍에 맞춰 `.env.stage` / `.env.prod` 수정 예정

## 진행 상황 (2026-07-07)

이메일 모듈(`email_log`) 작업 중 실제 서버 상태 확인:
- **prod엔 아직 아무 테이블도 없음** — prod가 8일 전 커밋(#40, feed·comment·post·notification 이전)에 멈춰있어서, `main` 머지가 안 된 만큼 `ddl-auto`가 만든 것도 없음(`prod.db` 0바이트). stage는 4개 테이블(`comments`, `notification_subscriptions`, `magic_link_tokens`, `posts`) 이미 존재.
- `flyway_schema_history` 테이블 stage·prod 둘 다 없음 — Flyway 미도입 재확인.
- **도입 시점 판단**: 지금(개발 중) 말고 **실제 운영 시작 전**으로 미루기로 함. prod가 사실상 비어있는 지금이 베이스라인 부담이 제일 적은 타이밍이라, 이 창을 넘기지 않는 게 중요 — `main` 머지로 prod에 실데이터가 쌓이기 시작하면 그때부턴 stage처럼 베이스라인 처리가 필요해짐.

---

## 백엔드가 할 일

```gradle
// build.gradle
implementation 'org.flywaydb:flyway-core'
```

```yaml
# application.yml
spring:
  jpa:
    hibernate:
      ddl-auto: none   # update에서 변경
  flyway:
    locations: classpath:db/migration
```

첫 마이그레이션 파일(`V1__init.sql`)에 전체 CREATE TABLE 넣으면 끝.
