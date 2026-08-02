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

class AnalyticsProjectIdentityUpgradeTest {

    @TempDir Path tempDir;

    @Test
    void migrationConnectsExistingProjectPathsToStableIds() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("analytics-project-upgrade.db");
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260802110000");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into projects (
                    id, title, summary, cohort, github_url, start_date, end_date,
                    hidden, created_at, updated_at
                ) values (
                    52, '이전 프로젝트', '소개', 14, null, null, null,
                    false, '2026-08-01T09:00:00', '2026-08-01T09:00:00'
                )
                """);
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into analytics_page_views (
                    id, path, occurred_at, content_type, content_id
                ) values (8, '/projects/52', '2026-08-01T10:00:00', null, null)
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement();
             ResultSet row = statement.executeQuery(
                     "select content_type, content_id, path from analytics_page_views where id = 8")) {
            assertThat(row.next()).isTrue();
            assertThat(row.getString("content_type")).isEqualTo("PROJECT");
            assertThat(row.getLong("content_id")).isEqualTo(52L);
            assertThat(row.getString("path")).isEqualTo("/projects/52");
        }
    }
}
