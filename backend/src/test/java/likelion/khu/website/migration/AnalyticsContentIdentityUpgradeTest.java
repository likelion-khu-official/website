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

class AnalyticsContentIdentityUpgradeTest {

    @TempDir Path tempDir;

    @Test
    void migrationConnectsExistingBlogPathsToStablePostIds() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("analytics-content-upgrade.db");
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260802100000");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into posts (
                    id, slug, title, content, author_name, author_part_json, author_member_id,
                    status, summary, thumbnail_url, published_at, created_at, updated_at
                ) values (
                    41, 'migration-story', '이전 글', '본문', '운영진', '[]', null,
                    'PUBLISHED', '요약', null, '2026-08-01T09:00:00',
                    '2026-08-01T09:00:00', '2026-08-01T09:00:00'
                )
                """);
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into analytics_page_views (id, path, occurred_at)
                values (7, '/blog/migration-story', '2026-08-01T10:00:00')
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement();
             ResultSet row = statement.executeQuery(
                     "select content_type, content_id, path from analytics_page_views where id = 7")) {
            assertThat(row.next()).isTrue();
            assertThat(row.getString("content_type")).isEqualTo("BLOG_POST");
            assertThat(row.getLong("content_id")).isEqualTo(41L);
            assertThat(row.getString("path")).isEqualTo("/blog/migration-story");
        }
    }
}
