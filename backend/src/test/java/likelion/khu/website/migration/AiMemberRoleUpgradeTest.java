package likelion.khu.website.migration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V6의 역할 확장 마이그레이션이 기존 데이터를 올바르게 변환하는지 검증한다.
 *
 * 테스트 1 — 이전 버전과 호환 가능한 역할 보존:
 *   V2 상태에서 DESIGN(구·신 모두 유효)을 심고 전체 마이그레이션 후 보존·신 역할 삽입 확인.
 *
 * 테스트 2 — V6 역할 매핑 실행 검증:
 *   V5 상태에서 V3_LEGACY_ROLES *전부*를 심고(부분집합이 아니라) V6 적용 후 각 값이
 *   V6_ROLE_MAPPING·V6_DELETED_ROLES에 선언된 대로 처리됐는지 확인한다. 시드가 완전하므로
 *   이 테스트는 "죽지 않는지"까지 함께 검증한다 — raw copy 같은 순진한 마이그레이션이었다면
 *   여기서 CHECK 위반으로 즉시 실패했을 것이다(실제 배포 사고, 07-27, #253으로 수정).
 */
class AiMemberRoleUpgradeTest {

    /**
     * {@code V3__add_ai_member_role.sql}이 확정하고 V4·V5가 그대로 물려받은
     * member_roles.role / project_participants.part의 CHECK 허용값 전체(6개).
     * V6가 실제로 마주칠 수 있는 기존 값의 원본 — CHECK 제약을 바꾸는 마이그레이션은
     * 이 집합의 값 전부에 대해 결과(매핑 또는 삭제)를 선언해야 한다.
     */
    private static final Set<String> V3_LEGACY_ROLES =
            Set.of("PM", "FE", "BE", "DESIGN", "AI", "INFRA");

    /** V6가 실제로 적용하는 개명 매핑 — V6__expand_member_roles.sql의 CASE 절과 동일해야 한다. */
    private static final Map<String, String> V6_ROLE_MAPPING = Map.of(
            "BE", "BACKEND",
            "FE", "FRONTEND",
            "DESIGN", "DESIGN",
            "AI", "AI"
    );

    /** V6가 폐지하며 행을 삭제하는 값 — V6의 {@code where role not in (...)} 절과 동일해야 한다. */
    private static final Set<String> V6_DELETED_ROLES = Set.of("PM", "INFRA");

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
    void v6HandlesEveryLegacyRoleAsDeclared() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("v6-role-map.db");

        MigrationUpgradeHarness.migrateTo(dbUrl, "5");

        // V3_LEGACY_ROLES 전부를 심는다(사람이 고른 부분집합이 아니라 완전성이 보장된
        // 상수 그대로) — 새 마이그레이션마다 이 두 줄(seedEach + migrateToLatest)만
        // 반복하면 "예전 값 전부를 만나도 안 죽는지"가 자동으로 검증된다.
        MigrationUpgradeHarness.seedEach(dbUrl,
                "insert into member_roles (member_id, role) values (%1$d, '%2$s')", V3_LEGACY_ROLES);
        MigrationUpgradeHarness.seedEach(dbUrl,
                "insert into project_participants (id, member_id, project_id, part) values (%1$d, %1$d, 1, '%2$s')",
                V3_LEGACY_ROLES);

        // 시드가 완전하므로, V6가 (과거 사고처럼) 값 매핑 없이 그대로 복사하는 마이그레이션이었다면
        // 여기서 CHECK 위반으로 즉시 실패한다.
        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {

            for (Map.Entry<String, String> mapping : V6_ROLE_MAPPING.entrySet()) {
                String oldValue = mapping.getKey();
                String newValue = mapping.getValue();
                assertThat(count(statement,
                        "select count(*) from member_roles where role = '%s'".formatted(newValue)))
                        .as("member_roles: %s → %s 매핑", oldValue, newValue)
                        .isEqualTo(1);
                assertThat(count(statement,
                        "select count(*) from project_participants where part = '%s'".formatted(newValue)))
                        .as("project_participants: %s → %s 매핑", oldValue, newValue)
                        .isEqualTo(1);
            }

            for (String deletedValue : V6_DELETED_ROLES) {
                assertThat(count(statement,
                        "select count(*) from member_roles where role = '%s'".formatted(deletedValue)))
                        .as("member_roles: %s는 삭제돼야 함", deletedValue)
                        .isZero();
                assertThat(count(statement,
                        "select count(*) from project_participants where part = '%s'".formatted(deletedValue)))
                        .as("project_participants: %s는 삭제돼야 함", deletedValue)
                        .isZero();
            }

            // 개명된 구 이름 자체가 잔재하지 않는지(BE/FE는 이름이 바뀌었을 뿐 값으로 남으면 안 됨)
            assertThat(count(statement, "select count(*) from member_roles where role in ('BE','FE')"))
                    .isZero();
        }
    }

    private int count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            return result.getInt(1);
        }
    }
}
