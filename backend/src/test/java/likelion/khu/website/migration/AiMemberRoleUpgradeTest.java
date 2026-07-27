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
 * V5가 기존 역할 데이터를 보존하면서 14개 역할 체계로 업그레이드하는지 검증한다.
 * V3/V5 CHECK 제약의 교집합('DESIGN', 'AI')을 V2 상태에서 삽입하고
 * 전체 마이그레이션 후에도 보존되는지, 그리고 새 역할('BACKEND_LEAD' 등)이
 * 정상 삽입되는지 확인한다.
 */
class AiMemberRoleUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void v5PreservesCompatibleRolesAndAcceptsNewRoles() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("role-upgrade.db");

        MigrationUpgradeHarness.migrateTo(dbUrl, "2");
        MigrationUpgradeHarness.execute(
                dbUrl,
                "insert into member_roles (member_id, role) values (1, 'DESIGN')"
        );
        MigrationUpgradeHarness.execute(
                dbUrl,
                "insert into project_participants (id, member_id, project_id, part) values (1, 1, 1, 'DESIGN')"
        );

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        MigrationUpgradeHarness.execute(
                dbUrl,
                "insert into member_roles (member_id, role) values (2, 'BACKEND_LEAD')"
        );
        MigrationUpgradeHarness.execute(
                dbUrl,
                "insert into project_participants (id, member_id, project_id, part) values (2, 2, 1, 'FRONTEND')"
        );

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            assertThat(count(statement, "select count(*) from member_roles where role = 'DESIGN'"))
                    .isEqualTo(1);
            assertThat(count(statement, "select count(*) from member_roles where role = 'BACKEND_LEAD'"))
                    .isEqualTo(1);
            assertThat(count(statement, "select count(*) from project_participants where part = 'DESIGN'"))
                    .isEqualTo(1);
            assertThat(count(statement, "select count(*) from project_participants where part = 'FRONTEND'"))
                    .isEqualTo(1);
        }
    }

    private int count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            return result.getInt(1);
        }
    }
}
