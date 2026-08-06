package likelion.khu.website.migration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * dbclient(SELECT 자유) 계정으로 살아있는 크리덴셜 토큰이 평문으로 읽히던 문제 대응 마이그레이션 검증.
 * password_reset_tokens·admin_invitations의 평문 token 컬럼을 token_hash로 재생성하면서 기존 행은
 * 의도적으로 버린다(해시는 애플리케이션에서만 계산 가능해 SQL로 옮길 수 없음 — 마이그레이션 주석 참고).
 * magic_link_tokens는 Flyway 도입 전(ddl-auto: update 시절) 생성된 죽은 테이블이라 실제로 있을 수도,
 * 이미 없을 수도 있어 두 경우 다 확인한다.
 */
class TokenHashMigrationUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void migrationDropsLegacyPlaintextTokensAndMagicLinkTable() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("token-hash-with-legacy-table.db");

        // 이 마이그레이션 직전 상태 재현: 평문 token 컬럼 + 옛 ddl-auto가 만들어둔 magic_link_tokens.
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260804163616");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into password_reset_tokens (used, admin_id, id, created_at, expires_at, token)
                values (0, 1, 1, '2026-01-01T00:00:00', '2026-01-01T00:00:00', 'legacy-plaintext-reset-token')
                """);
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into admin_invitations (id, created_at, email, expires_at, invited_by_email, status, token)
                values (1, '2026-01-01T00:00:00', 'a@khu.ac.kr', '2026-01-01T00:00:00', 'super@khu.ac.kr', 'PENDING', 'legacy-plaintext-invite-token')
                """);
        MigrationUpgradeHarness.execute(dbUrl,
                "create table magic_link_tokens (id integer primary key, token varchar(255) not null unique)");
        MigrationUpgradeHarness.execute(dbUrl,
                "insert into magic_link_tokens (id, token) values (1, 'legacy-plaintext-magic-link-token')");

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {

            // 기존 토큰 행은 해시할 방법이 없어 의도적으로 버려진다 — 남아있으면 안 된다.
            assertThat(count(statement, "select count(*) from password_reset_tokens"))
                    .as("기존 password_reset_tokens 행은 버려져야 함")
                    .isZero();
            assertThat(count(statement, "select count(*) from admin_invitations"))
                    .as("기존 admin_invitations 행은 버려져야 함")
                    .isZero();

            // 평문 token 컬럼 자체가 사라지고 token_hash로 대체됐어야 한다.
            assertThatThrownBy(() -> statement.executeQuery("select token from password_reset_tokens"))
                    .as("password_reset_tokens.token 컬럼은 더 이상 존재하지 않아야 함")
                    .isInstanceOf(SQLException.class);
            assertThatCode(() -> statement.executeQuery("select token_hash from password_reset_tokens"))
                    .doesNotThrowAnyException();

            assertThatThrownBy(() -> statement.executeQuery("select token from admin_invitations"))
                    .as("admin_invitations.token 컬럼은 더 이상 존재하지 않아야 함")
                    .isInstanceOf(SQLException.class);
            assertThatCode(() -> statement.executeQuery("select token_hash from admin_invitations"))
                    .doesNotThrowAnyException();

            // 죽은 magic_link_tokens 테이블은 통째로 제거됐어야 한다.
            assertThatThrownBy(() -> statement.executeQuery("select * from magic_link_tokens"))
                    .as("magic_link_tokens 테이블은 더 이상 존재하지 않아야 함")
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    void migrationSucceedsWhenMagicLinkTableAlreadyAbsent() {
        // stage/prod처럼 처음부터 magic_link_tokens가 없던(또는 이미 정리된) DB에서도
        // "drop table if exists"라 실패하지 않아야 한다 — 있든 없든 안전해야 함.
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("token-hash-without-legacy-table.db");

        MigrationUpgradeHarness.migrateTo(dbUrl, "20260804163616");

        assertThatCode(() -> MigrationUpgradeHarness.migrateToLatest(dbUrl))
                .doesNotThrowAnyException();
    }

    private int count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }
}
