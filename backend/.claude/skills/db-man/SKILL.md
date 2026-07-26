---
name: db-man
description: >-
  엔티티(@Entity/@Column/@JoinColumn/@GeneratedValue 등) 변경 시 db/migration SQL을
  같이 챙기고, 실제로 엔티티와 일치하는지 로컬에서 미리 검증하는 백엔드 스키마 동기화
  담당자. TRIGGER when 엔티티 필드/테이블/제약 추가·수정·삭제, ALTER/CREATE/DROP TABLE
  의도, "컬럼 추가/스키마 바꿔/테이블 만들어/FK 걸자/인덱스 추가" 발화, db/migration/
  아래 파일 작성 요청. DO NOT TRIGGER when Repository 조회 쿼리 메서드 추가(스키마
  불변), 서비스/컨트롤러 로직 수정, DB 접근 없는 리팩토링.
---

# db-man

## 정체성 한 줄

**이 레포는 Flyway(#133)로 스키마를 관리한다 — 엔티티를 고쳤으면 `db/migration/`에
SQL 파일을 같이 추가하는 게 전부다.** psql 등으로 서버 DB에 직접 반영할 필요가 없다 —
Flyway가 배포(CD) 시점에 알아서 적용한다. `dbclient` 계정으로도 스키마 변경은 기술적으로
차단돼 있다(`infra/db-access.md` 참고) — 그쪽으로 우회하지 않는다.

> 다른 레포(tech-blog-be)의 동명 스킬은 Flyway가 없어 psql로 엔티티·DDL 파일·RDS
> 3곳을 사람이 직접 맞추는 무거운 절차다. 여기는 Flyway가 그 반영 역할을 대신하므로
> 범위가 훨씬 좁다 — "마이그레이션 파일 빠뜨리지 않기 + 로컬에서 미리 검증"이 전부.

## 왜 이게 필요한가 (#133)

`ddl-auto: update`가 SQLite `ALTER TABLE` 실패(`UNIQUE` 컬럼 추가 등)를 조용히
삼켜 stage `members` 테이블에 `student_id` 컬럼이 몇 시간째 없이 떠 있던 사고 —
그 뒤로 `ddl-auto: validate`로 전환됐다. **엔티티만 고치고 마이그레이션 파일을
빠뜨리면 이제 앱 기동 자체가 실패한다**(로컬/CI는 `SchemaMigrationConsistency
IntegrationTest`에서, 놓치면 stage/prod 배포 시 헬스체크 실패 → 자동 롤백).

## 절차

1. **엔티티 변경사항 파악** — 추가/변경된 필드, 테이블, 제약(unique/nullable/FK).

2. **다음 버전 번호 확인 후 마이그레이션 파일 작성**
   ```bash
   ls backend/src/main/resources/db/migration/
   ```
   가장 큰 `V{n}`의 다음 번호로 `V{n+1}__설명.sql` 신규 생성. **머지된 파일은 절대 수정하지 않는다**(체크섬 불일치 시 stage는 자동 초기화, prod는 기동 실패).

3. **SQLite 제약 주의** — `ALTER TABLE`은 `DROP COLUMN`도, 컬럼에 `UNIQUE`/`CHECK` 제약을 붙이는 것도 못 한다(#133 원인 그 자체). 이런 변경이 필요하면 직접 SQL로 "새 테이블 생성 → 데이터 복사 → 기존 테이블 DROP → RENAME" 패턴을 쓴다:
   ```sql
   CREATE TABLE members_new (...);
   INSERT INTO members_new SELECT ... FROM members;
   DROP TABLE members;
   ALTER TABLE members_new RENAME TO members;
   ```

4. **`@GeneratedValue(IDENTITY)` PK ↔ FK 타입 짝 맞추기** — `org.hibernate.community.dialect.SQLiteDialect`는 생성 시엔 identity PK를 SQLite rowid 별칭 규칙에 맞춰 `integer`로 만들지만, 검증 시엔 그걸 모르고 일반 규칙(`Long`→`bigint`)으로 비교하는 dialect 자체 버그가 있다(#133에서 실측 확인).
   - **왜 이런 버그가 나나:** SQLite에서 `@GeneratedValue(IDENTITY)`(자동증가 PK)가 실제로 동작하려면 컬럼이 정확히 `INTEGER PRIMARY KEY`로 선언돼야 SQLite 내부 rowid의 별칭이 된다(SQLite 자체 규칙, Hibernate와 무관). `SQLiteDialect`는 테이블을 **만들 때는** 이 규칙을 알아서 PK를 `integer`로 만드는데, 기동 시 **검증할 때는** 이 규칙을 모르고 일반적인 Java `Long`→`bigint` 매핑으로 비교한다 — 자기가 방금 `integer`로 만들어놓고 검증할 땐 "이거 `bigint`여야 하는데?"라고 스스로 틀렸다고 판정하는 구조.
   - 그래서 이 레포 엔티티는:
     - PK 필드: `@Column(columnDefinition = "integer")` — SQLite가 실제로 요구하는 타입을 명시해서 검증 오판을 막는다.
     - 그 PK를 참조하는 FK 필드(`@JoinColumn`/일반 `Long xxxId`): `columnDefinition = "bigint"` — 마이그레이션 SQL에 실제로 박힌 물리 타입에 맞춘다. SQLite는 PK가 아닌 컬럼에서 `integer`/`bigint` 타입 이름 차이가 기능적으로 없어서(둘 다 같은 정수로 저장) 안전하게 맞춰줄 수 있다.
   - 새 엔티티를 만들 때 이 패턴을 안 따르면 `validate`가 기동 시점에 바로 실패한다 — **이유를 다시 유도하려 하지 말고 기존 엔티티(`Member`, `Post` 등)를 그대로 복사해서 쓸 것.**

5. **로컬에서 즉시 검증**
   ```bash
   cd backend && ./gradlew test --tests "*SchemaMigrationConsistencyIntegrationTest*"
   ```
   이 테스트가 하는 일: 빈 DB를 새로 만들어서 `db/migration/`의 SQL 파일을 전부 순서대로 실제 적용한 뒤, 그 결과 DB에 대고 `ddl-auto=validate`로 앱을 실제 기동시켜본다 — 엔티티와 마이그레이션이 안 맞으면 여기서 기동 자체가 실패해 테스트가 빨간불이 된다.
   **왜 필요한가:** "엔티티만 고치고 마이그레이션 파일을 빠뜨리는" 실수는 원래 stage/prod 배포 시점에야 발견됐다(헬스체크 실패 → CD 자동 롤백). 이 테스트는 그 발견 시점을 배포 전, 본인 로컬/PR 단계로 앞당기는 것뿐이다 — PR 올리기 전에 반드시 통과시킬 것. (전체 스위트: `./gradlew test`)

6. **enum 값 추가/변경은 `validate`도 이 로컬 테스트도 못 잡는다 — 수동으로 확인할 것.** `@Enumerated(EnumType.STRING)` 필드는 SQL에서 `CHECK (col IN ('A','B',...))`로 박힌다 — CHECK 제약은 "이 컬럼엔 이 값들만 들어올 수 있다"고 DB 자체에 거는 제약으로, 어긴 쓰기는 애플리케이션 코드가 뭘 하든 DB가 직접 거부한다. Hibernate의 스키마 검증은 컬럼 존재·타입만 보지 CHECK 제약 **안의 값 목록**은 안 본다 — enum에 새 값을 추가하고 그 CHECK를 갱신하는 마이그레이션(재생성 패턴, 아래)을 빠뜨려도 컴파일·`validate`·앱 기동까지 전부 멀쩡히 통과한다. 그 값으로 실제 INSERT/UPDATE가 일어나는 순간에야 DB가 CHECK 위반으로 터진다 — 자동 검증 어디에도 안 걸리고 실사용 시점에야 드러나는 케이스라 특히 주의. **enum 값을 바꿀 땐 항상 마이그레이션에 CHECK 갱신도 같이 넣을 것** — 자동으로 안 잡히니 직접 챙겨야 한다.

7. **Flyway 마이그레이션은 CD 롤백으로 안 되돌아간다.** CD의 자동 롤백(#158~#162)은 "이전 컨테이너 이미지로 교체"일 뿐 — 이미 실행된 마이그레이션(테이블·컬럼 변경)은 DB에 그대로 남는다. 위험한 변경이 배포된 뒤 코드만 롤백되면, 옛 코드가 새 스키마를 상대해야 하는 애매한 상태가 될 수 있다. 그래서:
   - 가능하면 **확장 먼저, 정리는 나중에**(expand-contract) 패턴을 쓴다 — 컬럼 삭제 대신: ①새 컬럼 추가(nullable, 이 상태로 배포·안정화 확인) → ②코드가 새 컬럼을 쓰도록 전환 → ③한참 뒤 별도 마이그레이션으로 옛 컬럼 제거. 각 단계가 그 자체로 안전해서, 어느 시점에 코드만 롤백돼도 스키마와 안 어긋난다.
   - 파괴적 변경(`DROP TABLE`/`DROP COLUMN`, 기존 데이터 있는 컬럼에 `NOT NULL` 추가, 타입 축소)은 되돌릴 SQL을 마이그레이션과 별도로 PR에 같이 적어둘 것 — Flyway가 자동으로 안 해주니 사람이 필요할 때 수동 실행할 수 있게.
   - PR 설명에 무엇이 바뀌는지, 기존 데이터는 어떻게 되는지 명시하고 인프라(장찬욱)·PM(김우진)에게 리뷰 요청.

8. **로컬 개발 DB가 Flyway 도입 이전 파일이면 baseline이 깨질 수 있다.** stage/prod는 실제 DB 사본으로 baseline이 실측 검증됐지만, 각자 로컬 SQLite 파일은 그런 검증을 거치지 않았다 — 기동이 안 되면 로컬 DB 파일만 지우고 재기동하면 Flyway가 처음부터 새로 만든다. **지울 파일 경로는 고정돼 있지 않다** — `backend/.env.example`의 `DB_PATH`는 빈 값이라, 실제 값은 각자 로컬 `.env`(git-ignore 대상)에 본인이 지정한 경로다. 본인 `.env`를 열어 `DB_PATH=` 값을 확인하고 그 파일을 지울 것(`backend/data/`가 `.gitignore`에 잡혀 있어 관례적으로 그 아래 두는 경우가 많지만 강제는 아님). 실제 데이터를 보존해야 하는 상황이 아니라면 이게 제일 빠르다.

9. **PR 본문에 체크 블록 포함**
   ```markdown
   ## 스키마 변경 체크
   - [x] 엔티티 수정
   - [x] db/migration/V{n}__설명.sql 추가
   - [x] SchemaMigrationConsistencyIntegrationTest 로컬 통과
   - [x] enum 값 변경 시 CHECK 제약도 같이 갱신했는지 확인
   - [x] (파괴적 변경 시) 영향 범위 + 되돌릴 SQL 명시, 리뷰 요청
   ```

## 하지 않는 것

- ❌ psql/sqlite3로 stage·prod DB에 스키마 직접 반영 — Flyway가 배포 시 자동으로 함, 이 레포엔 필요 없고 `dbclient`로는 기술적으로도 막혀 있음
- ❌ 엔티티 설계 판단(FK 방향, 정규화, 1:1 vs 1:N 등) — 백엔드 팀원·리뷰어 판단 영역
- ❌ 이미 머지된 마이그레이션 파일 수정 — 새 파일을 추가해서 고친다
- ❌ 로컬 검증(5번) 없이 PR 올리기
- ❌ 체크섬 불일치(`FlywayValidateException`, "checksum mismatch") 상황에서 `flyway repair`나 히스토리 테이블을 직접 손대기 — 원인(머지된 파일이 사후 수정됐는지 등)부터 파악해야 하니 인프라(장찬욱)에게 먼저 알림

## 막히면

- 파괴적 변경인지 애매하거나, 재생성 패턴 SQL이 복잡해서 확신이 안 서면 → 인프라(장찬욱)에게 리뷰 요청.
- 특히 위험한 변경(대상 테이블에 실데이터가 많거나, 여러 FK가 얽혀 있는 경우)이면 실제 stage DB 사본을 로컬로 받아(`scp`) 그 사본에 마이그레이션을 먼저 적용해보고 `ddl-auto=validate`로 기동까지 확인한 뒤 PR을 올린다 — Flyway 도입 자체가 이 방식으로 검증됐다(눈으로 스키마 diff 뜨는 것보다 확실).

## 참고 문서

- `backend/CLAUDE.md` — 스키마 변경 규칙 요약
- `infra/db-migration.md` — Flyway 설계·환경별 안전장치(stage는 `FlywayConfig.java`의 `@Profile("stage")` 커스텀 전략, prod는 `SPRING_FLYWAY_CLEAN_DISABLED=true`)
- `infra/db-access.md` — DB 접속 방법·`dbclient` 권한 경계
- `pm/docs/learnings.md` — #133 사고 타임라인 + SQLiteDialect 버그 발견 경위
