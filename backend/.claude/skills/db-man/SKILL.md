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

4. **`@GeneratedValue(IDENTITY)` PK ↔ FK 타입 짝 맞추기** — `org.hibernate.community.dialect.SQLiteDialect`는 생성 시엔 identity PK를 SQLite rowid 별칭 규칙에 맞춰 `integer`로 만들지만, 검증 시엔 그걸 모르고 일반 규칙(`Long`→`bigint`)으로 비교하는 dialect 자체 버그가 있다(#133에서 실측 확인). 그래서 이 레포 엔티티는:
   - PK 필드: `@Column(columnDefinition = "integer")`
   - 그 PK를 참조하는 FK 필드(`@JoinColumn`/일반 `Long xxxId`): `columnDefinition = "bigint"`(SQLite는 PK가 아닌 컬럼에서 `integer`/`bigint` 타입 이름 차이가 기능적으로 없다는 걸 이용)
   새 엔티티를 만들 때 이 패턴을 안 따르면 `validate`가 기동 시점에 바로 실패한다 — 기존 엔티티(`Member`, `Post` 등)를 템플릿으로 삼을 것.

5. **로컬에서 즉시 검증**
   ```bash
   cd backend && ./gradlew test --tests "*SchemaMigrationConsistencyIntegrationTest*"
   ```
   빈 DB에 `db/migration/`의 모든 SQL을 실제로 적용한 뒤 `ddl-auto=validate`로 엔티티 매핑과 대조한다. 여기서 실패하면 SQL이나 엔티티 어노테이션이 서로 안 맞는 것 — PR 올리기 전에 반드시 통과시킬 것. (전체 스위트: `./gradlew test`)

6. **파괴적 변경은 영향 범위를 PR에 명시** — `DROP TABLE`/`DROP COLUMN`(재생성 패턴 포함), 기존 데이터 있는 컬럼에 `NOT NULL` 추가, 타입 축소는 stage/prod 실데이터에 영향이 갈 수 있다. PR 설명에 무엇이 바뀌는지, 기존 데이터는 어떻게 되는지 명시하고 인프라(장찬욱)·PM(김우진)에게 리뷰 요청.

7. **PR 본문에 체크 블록 포함**
   ```markdown
   ## 스키마 변경 체크
   - [x] 엔티티 수정
   - [x] db/migration/V{n}__설명.sql 추가
   - [x] SchemaMigrationConsistencyIntegrationTest 로컬 통과
   - [x] (파괴적 변경 시) 영향 범위 명시 + 리뷰 요청
   ```

## 하지 않는 것

- ❌ psql/sqlite3로 stage·prod DB에 스키마 직접 반영 — Flyway가 배포 시 자동으로 함, 이 레포엔 필요 없고 `dbclient`로는 기술적으로도 막혀 있음
- ❌ 엔티티 설계 판단(FK 방향, 정규화, 1:1 vs 1:N 등) — 백엔드 팀원·리뷰어 판단 영역
- ❌ 이미 머지된 마이그레이션 파일 수정 — 새 파일을 추가해서 고친다
- ❌ 로컬 검증(4번) 없이 PR 올리기

## 참고 문서

- `backend/CLAUDE.md` — 스키마 변경 규칙 요약
- `infra/db-migration.md` — Flyway 설계·환경별 안전장치(`SPRING_FLYWAY_CLEAN_ON_VALIDATION_ERROR` 등)
- `infra/db-access.md` — DB 접속 방법·`dbclient` 권한 경계
- `pm/docs/learnings.md` — #133 사고 타임라인 + SQLiteDialect 버그 발견 경위
