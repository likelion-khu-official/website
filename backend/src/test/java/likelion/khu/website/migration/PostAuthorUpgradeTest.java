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

/**
 * V5가 소유자를 알 수 없는 기존 글을 훼손하지 않고, 이후 글에는 멤버 ID를 저장할 수 있는지 검증한다.
 */
class PostAuthorUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void v5PreservesLegacyPostsAndAcceptsAuthorMemberId() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("post-author-upgrade.db");

        MigrationUpgradeHarness.migrateTo(dbUrl, "4");
        MigrationUpgradeHarness.execute(
                dbUrl,
                """
                insert into posts (
                    id, slug, title, summary, content, thumbnail_url, author_name, author_part,
                    status, published_at, created_at, updated_at
                ) values (
                    1, 'legacy-post', '기존 글', null, '기존 본문', null, '기존 작성자', 'BE',
                    'PUBLISHED', '2026-01-01T00:00:00', '2026-01-01T00:00:00', '2026-01-01T00:00:00'
                )
                """
        );

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            assertThat(value(statement, "select title from posts where id = 1"))
                    .isEqualTo("기존 글");
            assertThat(value(statement, "select author_member_id from posts where id = 1"))
                    .isNull();
        }

        MigrationUpgradeHarness.execute(
                dbUrl,
                "update posts set author_member_id = 32 where id = 1"
        );

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            assertThat(value(statement, "select author_member_id from posts where id = 1"))
                    .isEqualTo("32");
        }
    }

    private String value(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            return result.getString(1);
        }
    }
}
