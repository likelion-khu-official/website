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

class PostCoauthorUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void migrationKeepsExistingPostAndAddsEmptyBylineList() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("post-coauthor-upgrade.db");
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260806100345");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into posts (
                    id, slug, title, content, author_name, author_part_json, author_member_id,
                    status, created_at, updated_at
                ) values (
                    1, 'existing-post', '기존 글', '본문', '기존 작성자', '[]', null,
                    'PUBLISHED', '0', '0'
                )
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "select title, coauthors_json from posts where id = 1")) {
            assertThat(result.next()).isTrue();
            assertThat(result.getString("title")).isEqualTo("기존 글");
            assertThat(result.getString("coauthors_json")).isEqualTo("[]");
        }
    }
}
