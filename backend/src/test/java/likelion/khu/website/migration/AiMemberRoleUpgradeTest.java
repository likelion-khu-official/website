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
 * V3가 기존 역할 데이터를 보존하면서 AI 역할을 실제 SQLite CHECK 제약에 추가하는지 검증한다.
 * 엔티티 enum만 바꾸면 이미 떠 있는 stage/prod DB의 제약은 그대로라 AI 저장이 실패하므로,
 * V2 실데이터 위 업그레이드 경로를 직접 재현한다.
 */
class AiMemberRoleUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void v3PreservesExistingRolesAndAcceptsAiRoles() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("ai-role-upgrade.db");

        MigrationUpgradeHarness.migrateTo(dbUrl, "2");
        MigrationUpgradeHarness.execute(
                dbUrl,
                "insert into member_roles (member_id, role) values (1, 'BE')"
        );
        MigrationUpgradeHarness.execute(
                dbUrl,
                "insert into project_participants (id, member_id, project_id, part) values (1, 1, 1, 'DESIGN')"
        );

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        MigrationUpgradeHarness.execute(
                dbUrl,
                "insert into member_roles (member_id, role) values (2, 'AI')"
        );
        MigrationUpgradeHarness.execute(
                dbUrl,
                "insert into project_participants (id, member_id, project_id, part) values (2, 2, 1, 'AI')"
        );

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            assertThat(count(statement, "select count(*) from member_roles where role = 'BE'"))
                    .isEqualTo(1);
            assertThat(count(statement, "select count(*) from member_roles where role = 'AI'"))
                    .isEqualTo(1);
            assertThat(count(statement, "select count(*) from project_participants where part = 'DESIGN'"))
                    .isEqualTo(1);
            assertThat(count(statement, "select count(*) from project_participants where part = 'AI'"))
                    .isEqualTo(1);
        }
    }

    private int count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            return result.getInt(1);
        }
    }
}
