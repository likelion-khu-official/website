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

### Stage — 코드로 처리 (`backend/.../config/FlywayConfig.java`)

**(2026-07-24 변경) `SPRING_FLYWAY_CLEAN_ON_VALIDATION_ERROR` env var는 더 이상 안 씀 — Flyway 10에서 이 설정 자체가 제거돼 값을 넣기만 해도 앱이 기동 실패한다.** 같은 동작(체크섬 불일치 시 DB 전체 날리고 처음부터 재적용)을 `@Profile("stage")` 전용 `FlywayMigrationStrategy` 빈으로 코드에 재구현했다 — env var보다 안전한 이유는 아래 "진행 상황 (2026-07-24)" 참고.

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

1. ~~`.env.stage` 에 `SPRING_FLYWAY_CLEAN_ON_VALIDATION_ERROR=true` 추가~~ → (2026-07-24) Flyway 10에서 제거돼 더 이상 안 씀, `FlywayConfig.java`로 대체
2. `.env.prod` 에 `SPRING_FLYWAY_CLEAN_DISABLED=true` 추가
3. `application.yml` 에서 `ddl-auto: update` → ~~`none`~~ **`validate`로 변경**(백엔드 소관, 2026-07-23 실제 도입 시 `none`에서 상향) — 마이그레이션이 엔티티 매핑과 실제로 맞는지 기동 시점에 검증해서, 안 맞으면 기동 자체가 실패한다(→ CD 헬스체크 실패 → 자동 롤백). `none`은 검증을 아예 안 해서 마이그레이션이 잘못돼도 앱이 그냥 뜨고 실제 요청이 그 컬럼을 건드릴 때에야 터진다 — #133의 "DDL 실패가 조용히 묻힌다"는 문제를 그대로 남기는 셈이라 상향했다.

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

## 진행 상황 (2026-07-23) — 도입 완료

#133(stage `members.student_id` ALTER 실패 → 조용한 500) 계기로 실제 도입. 이 문서가 예상 못 했던 것들:

- **prod가 그 사이 dev를 훨씬 못 따라간 상태였다** — Flyway 붙이기 전에 dev→main 승격(#161)으로 먼저 스키마·기능을 맞췄다. 그 과정에서 `members.student_id` ALTER가 prod에서도 똑같이 실패해 실제 배포 사고가 한 번 났고(수동 롤백 후 패치, 상세는 `pm/docs/learnings.md`), CD 롤백 마커 타이밍 버그(#162)도 이때 같이 발견·수정됐다.
- **`ddl-auto: none`이 아니라 `validate`로 갔다** — 이 문서 초안은 `none`을 전제했지만, `none`은 마이그레이션이 틀려도 기동은 성공하고 실제 요청이 그 컬럼을 건드릴 때에야 터진다 — #133이 지적한 "DDL 실패가 조용히 묻힌다"는 문제를 그대로 남긴다. `validate`는 기동 시점에 엔티티-DB 불일치를 잡아 배포 자체를 막는다.
- **`validate` 도입 중 별도의 Hibernate dialect 버그를 발견·우회했다** — `org.hibernate.community.dialect.SQLiteDialect`가 `@GeneratedValue(IDENTITY)` PK를 생성할 땐 SQLite의 rowid 별칭 규칙에 맞춰 `integer`로 만들면서, 검증할 땐 그걸 모르고 일반 규칙(`Long`→`bigint`)으로 비교해 자기가 방금 만든 테이블조차 자기 검증에 실패하는 구조적 버그였다(빈 DB로 재현 확인). PK 필드엔 `@Column(columnDefinition = "integer")`, 그 PK를 참조하는 FK 필드엔 반대로 실제 물리 상태(`bigint`)에 맞춰 `columnDefinition = "bigint"`를 명시해 우회 — SQLite는 PK가 아닌 컬럼에서 `integer`/`bigint` 타입 이름 차이가 기능적으로 없다는 점을 활용했다(총 14개 엔티티 PK + FK 8곳).
- **baseline은 실제 stage DB 사본으로 실측 검증했다** — 로컬에 stage.db를 복사해 `ddl-auto=validate`로 직접 띄워보고 통과를 확인한 뒤에야 baseline SQL을 확정했다(눈으로 스키마 diff 뜨는 것보다 훨씬 확실).

## 진행 상황 (2026-07-24) — stage 안전장치를 env var에서 코드로 이전

#133 Flyway 도입 PR 머지 직후 dev→stage CD가 실패했다(자동 롤백, 데이터 영향 없음). 원인: Spring Boot 3.5.16이 끌어오는 Flyway 10.x에서 `spring.flyway.clean-on-validation-error`(= `SPRING_FLYWAY_CLEAN_ON_VALIDATION_ERROR`) 프로퍼티 자체가 제거됨 — 값을 설정하기만 해도 Flyway 인스턴스 생성 단계에서 "has been removed" 예외.

**9버전으로 내려서 우회하지 않았다** — Spring Boot 3.5.x는 Flyway 10.x대에 맞춰 auto-configuration이 짜여 있어서, 억지로 내리면 이 프로퍼티는 살아나도 다른 연동 지점이 검증 안 된 조합으로 깨질 위험이 있다. 대신 같은 동작을 `backend/src/main/java/likelion/khu/website/config/FlywayConfig.java`의 `@Profile("stage")` 전용 `FlywayMigrationStrategy` 빈으로 재구현:

```java
@Bean
@Profile("stage")
public FlywayMigrationStrategy stageCleanOnValidationErrorStrategy() {
    return flyway -> {
        try {
            flyway.migrate();
        } catch (FlywayValidateException e) {
            flyway.clean();
            flyway.migrate();
        }
    };
}
```

**env var 방식보다 이게 더 안전한 이유:** env var는 이름을 실수로 `.env.prod`에 복붙하면 prod도 자동 clean 대상이 될 수 있었다 — `@Profile` 분리는 그 실수 자체가 구조적으로 불가능하다(prod엔 이 빈이 아예 안 생김). 서버 조치는 `.env.stage`에서 `SPRING_FLYWAY_CLEAN_ON_VALIDATION_ERROR` 줄 삭제뿐, `.env.prod`는 원래부터 이 변수가 없어서 그대로 안전했다(`SPRING_FLYWAY_CLEAN_DISABLED=true`만 있음, 이건 지금도 유효한 설정).

---

## 백엔드가 한 일 (실제 구현)

```gradle
// build.gradle
implementation 'org.flywaydb:flyway-core'   // SQLite는 core에 기본 포함, 별도 유료 모듈 불필요
```

```yaml
# application.yml
spring:
  jpa:
    hibernate:
      ddl-auto: validate   # update에서 변경 — none이 아니라 validate로 간 이유는 위 "진행 상황" 참고
  flyway:
    baseline-on-migrate: true
    baseline-version: 1   # V1(baseline.sql)까지는 이미 적용된 걸로 간주 — 기존 stage/prod엔 재실행 안 됨
```

`db/migration/V1__baseline.sql`에 현재 엔티티 매핑이 실제로 생성하는 전체 CREATE TABLE을 담았다(`ddl-auto=create`로 빈 DB에 직접 띄워 Hibernate가 낸 SQL을 그대로 캡처). 테스트(`src/test/resources/application.yml`)는 여전히 `create-drop` + `spring.flyway.enabled: false`로 격리된 `:memory:` DB를 매번 새로 만든다 — Flyway와 충돌 방지.
