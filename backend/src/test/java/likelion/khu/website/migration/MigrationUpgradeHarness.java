package likelion.khu.website.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Collection;

/**
 * "이미 앞 버전까지 적용된, 실데이터가 있는 DB에 새 마이그레이션이 얹혔을 때"를 재현하는
 * 재사용 도구 — Flyway의 target 옵션으로 "옛 버전까지만 적용 → raw SQL로 그 시점 데이터
 * 심기 → 최신까지 적용"을 흉내낸다. git으로 옛 엔티티를 체크아웃하거나 별도 worktree를 팔
 * 필요가 없다 — 머지된 마이그레이션 파일은 절대 안 바뀌므로(db-man 규칙) 그 시점 스키마를
 * raw SQL로 그대로 재현하면 충분하다.
 *
 * Spring 컨텍스트 없이 Flyway Java API + 순수 JDBC만 쓴다 — 엔티티가 이미 "새 버전"을
 * 전제하기 때문에(예: 이번 PR의 Member는 offboardedAt을 이미 알고 있음) Hibernate/Repository
 * 경유로는 "옛 버전 데이터 심기" 자체가 불가능하다.
 *
 * 사용법은 db-man 스킬(backend/.claude/skills/db-man/SKILL.md) "파괴적 재생성 마이그레이션
 * 검증" 절 참고.
 */
public final class MigrationUpgradeHarness {

    private MigrationUpgradeHarness() {
    }

    /** {@code targetVersion}까지만 마이그레이션을 적용한다(예: "1" = V1만). */
    public static void migrateTo(String jdbcUrl, String targetVersion) {
        Flyway.configure()
                .dataSource(jdbcUrl, null, null)
                .locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion(targetVersion))
                .load()
                .migrate();
    }

    /** 남은 마이그레이션을 전부(최신까지) 적용한다. */
    public static void migrateToLatest(String jdbcUrl) {
        Flyway.configure()
                .dataSource(jdbcUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }

    /** 옛 버전 시점의 데이터를 심기 위한 raw SQL 실행 — 트랜잭션 하나로 커밋한다. */
    public static void execute(String jdbcUrl, String sql) {
        try (Connection con = DriverManager.getConnection(jdbcUrl);
             Statement st = con.createStatement()) {
            st.execute(sql);
        } catch (SQLException e) {
            throw new RuntimeException("시드 SQL 실행 실패: " + sql, e);
        }
    }

    /**
     * {@code legacyValues} 각각을 한 행씩 반복 삽입한다 — {@code insertSqlTemplate}은
     * 순번({@code %1$d})과 값({@code %2$s})을 채워 넣는 {@link String#formatted} 포맷
     * 문자열이다(예: {@code "insert into member_roles (member_id, role) values (%1$d, '%2$s')"}).
     *
     * CHECK 제약(enum)을 좁히거나 값 이름을 바꾸는 마이그레이션을 새로 쓸 때, 그 직전
     * 버전까지 허용됐던 값 *전체*를 이걸로 심고 {@link #migrateToLatest}를 호출하면
     * "예전 값을 만나도 안 죽는지"가 자동으로 검증된다 — naive `insert ... select`처럼
     * 값 매핑을 빠뜨린 마이그레이션은 여기서 즉시 예외를 던져 테스트를 실패시킨다
     * (V6 배포 사고, 2026-07-27 — 시드가 6개 중 1개뿐이라 이 안전망이 못 걸렸다).
     * 상세 절차는 db-man 스킬 "enum 값 추가/변경" 절 참고.
     */
    public static void seedEach(String jdbcUrl, String insertSqlTemplate, Collection<String> legacyValues) {
        int seq = 1;
        for (String value : legacyValues) {
            execute(jdbcUrl, insertSqlTemplate.formatted(seq++, value));
        }
    }
}
