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

class AnonymousVisitorUpgradeTest {

    @TempDir Path tempDir;

    @Test
    void existingPageViewsRemainAndHaveNoInventedVisitorIdentity() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("anonymous-visitor-upgrade.db");
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260802130000");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into analytics_page_views (id, path, occurred_at, content_type, content_id)
                values (1, '/', '2026-08-02T10:00:00', null, null)
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement();
             ResultSet row = statement.executeQuery(
                     "select path, visitor_key from analytics_page_views where id = 1")) {
            assertThat(row.next()).isTrue();
            assertThat(row.getString("path")).isEqualTo("/");
            assertThat(row.getString("visitor_key")).isNull();
        }
    }
}
