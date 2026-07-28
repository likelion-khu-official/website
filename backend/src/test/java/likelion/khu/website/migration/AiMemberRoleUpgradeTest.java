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
 * V6의 역할 확장 마이그레이션이 기존 데이터를 올바르게 변환하는지 검증한다.
 *
 * 테스트 1 — 이전 버전과 호환 가능한 역할 보존:
 *   V2 상태에서 DESIGN(구·신 모두 유효)을 심고 전체 마이그레이션 후 보존·신 역할 삽입 확인.
 *
 * 테스트 2 — V6 역할 매핑:
 *   V5 상태에서 구 역할(BE/FE/DESIGN/AI/PM/INFRA)을 심고 V6 적용 후
 *   BE→BACKEND, FE→FRONTEND, DESIGN/AI 보존, PM·INFRA 삭제를 확인한다.
 */
class AiMemberRoleUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void v6PreservesCompatibleRolesAndAcceptsNewRoles() throws SQLException {
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

    @Test
    void v6MapsOldRolesToNewRolesAndDropsObsoleteRoles() throws SQLException {
        // V5 상태 = 구 CHECK(PM/FE/BE/DESIGN/AI/INFRA)가 살아 있는 마지막 버전
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("v6-role-map.db");

        MigrationUpgradeHarness.migrateTo(dbUrl, "5");

        // 스테이지에 실재하는 구 역할 조합을 재현
        MigrationUpgradeHarness.execute(dbUrl,
                "insert into member_roles (member_id, role) values (1,'BE'),(2,'FE'),(3,'DESIGN'),(4,'AI'),(5,'PM'),(6,'INFRA')");
        MigrationUpgradeHarness.execute(dbUrl,
                "insert into project_participants (id, member_id, project_id, part) values (1,1,1,'BE'),(2,2,1,'FE'),(3,5,1,'PM')");

        // V6 적용
        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            // 매핑 검증
            assertThat(count(statement, "select count(*) from member_roles where role='BACKEND'")).isEqualTo(1);
            assertThat(count(statement, "select count(*) from member_roles where role='FRONTEND'")).isEqualTo(1);
            assertThat(count(statement, "select count(*) from member_roles where role='DESIGN'")).isEqualTo(1);
            assertThat(count(statement, "select count(*) from member_roles where role='AI'")).isEqualTo(1);
            // PM·INFRA 행 삭제 검증
            assertThat(count(statement, "select count(*) from member_roles where role in ('PM','INFRA')")).isEqualTo(0);
            // 구 이름 잔재 없음
            assertThat(count(statement, "select count(*) from member_roles where role in ('BE','FE')")).isEqualTo(0);

            // project_participants 동일 확인
            assertThat(count(statement, "select count(*) from project_participants where part='BACKEND'")).isEqualTo(1);
            assertThat(count(statement, "select count(*) from project_participants where part='FRONTEND'")).isEqualTo(1);
            assertThat(count(statement, "select count(*) from project_participants where part='PM'")).isEqualTo(0);
        }
    }

    private int count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            return result.getInt(1);
        }
    }
}
