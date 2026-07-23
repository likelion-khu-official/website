# 백엔드 — 하네스 (골격)

> 골격. BE 멤버/PM이 채워나간다.

## 시작 전 읽기
1. 루트 `CLAUDE.md`
2. `pm/docs/`: `learnings.md` → `brief.md`
3. `shared/` (FE↔BE API 타입)

## 오너십
데이터 모델·API·인증·admin/CMS·지원폼·모집상태.

## 역할 메모
- 비주얼 디자인 안 기다림 — 거친 흐름(와이어/IA)·데이터 요구로 병렬.
- API 계약은 `shared/`에 타입으로 노출(FE가 mock으로 먼저 씀).

## 스키마 변경 시 필수 — Flyway 마이그레이션 (#133)

`ddl-auto: update`가 SQLite `ALTER TABLE` 실패(예: `UNIQUE` 컬럼 추가)를 조용히 삼켜 스키마 드리프트가 났던 사고(#133) 이후, **`ddl-auto: validate`로 전환됐다 — Hibernate가 스키마를 더 이상 자동으로 안 만든다.**

엔티티에 필드·테이블을 추가/변경했으면 **반드시** `backend/src/main/resources/db/migration/`에 `V{다음 번호}__설명.sql` 파일을 같이 추가할 것. 엔티티만 고치고 이 파일을 빠뜨리면:
- 로컬/CI: `SchemaMigrationConsistencyIntegrationTest`가 컨텍스트 기동 단계에서 바로 실패(빈 DB에 마이그레이션을 전부 적용한 뒤 엔티티 매핑과 대조)
- 그래도 놓치면: stage/prod 배포 시 앱이 기동 자체를 못 해 헬스체크 실패 → CD가 자동 롤백

SQLite는 `ALTER TABLE`이 `DROP COLUMN`·`UNIQUE` 컬럼 추가 등을 지원 안 함 — 이런 변경이 필요하면 "새 테이블 생성 → 데이터 복사 → 테이블 교체" 패턴으로 SQL을 직접 써야 한다. 상세·예시는 `infra/db-migration.md` 참고. **한 번 머지된 마이그레이션 파일은 절대 수정하지 말 것**(체크섬 불일치로 stage는 자동 초기화, prod는 기동 실패).

## SecurityConfig 추가 시 필수 체크

SecurityFilterChain 빈을 직접 정의하는 순간 Spring Boot의 `ManagementWebSecurityAutoConfiguration`이 꺼진다.
그 결과 `/actuator/health`도 인증 대상이 되어 **CD 헬스체크가 조용히 깨진다**.

SecurityConfig를 만들 때 반드시:
```java
.requestMatchers(EndpointRequest.to(HealthEndpoint.class)).permitAll()
```
또는
```java
.requestMatchers("/actuator/health").permitAll()
```
를 포함할 것. `EndpointRequest` 방식이 포트·경로 변경에 더 강함.
