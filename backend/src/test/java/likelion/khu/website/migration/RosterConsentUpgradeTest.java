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
 * V4가 기존 명단을 임의로 공개하지 않고, 새 프로필·동의 증적을 저장할 수 있는지 검증한다.
 */
class RosterConsentUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void v4KeepsExistingRowsPrivateAndAddsProfileColumns() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("roster-consent-upgrade.db");

        MigrationUpgradeHarness.migrateTo(dbUrl, "3");
        MigrationUpgradeHarness.execute(
                dbUrl,
                """
                insert into members (
                    cohort, failed_login_attempts, must_change_password, id, created_at, created_by,
                    emoji, join_reason, locked_until, name, offboarded_at, password_hash, phone,
                    photo_url, student_id, updated_at, updated_by
                ) values (
                    14, 0, true, 1, '2026-01-01T00:00:00', 'admin@example.com',
                    '🦁', '테스트 참여 이유', null, '테스트멤버', null, 'hash', '01000000000',
                    null, '2026000001', '2026-01-01T00:00:00', 'admin@example.com'
                )
                """
        );
        MigrationUpgradeHarness.execute(
                dbUrl,
                """
                insert into staff (
                    admission_year, sort_order, id, created_at, created_by, department,
                    introduction, name, photo_url, position, updated_at, updated_by
                ) values (
                    26, 1, 1, '2026-01-01T00:00:00', 'admin@example.com', '테스트학과',
                    '테스트 소개', '테스트운영진', '/logo.png', '회장',
                    '2026-01-01T00:00:00', 'admin@example.com'
                )
                """
        );

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            assertThat(value(statement, "select publication_consent from members where id = 1"))
                    .isEqualTo("0");
            assertThat(value(statement, "select publication_consent from staff where id = 1"))
                    .isEqualTo("0");
        }

        MigrationUpgradeHarness.execute(
                dbUrl,
                """
                update members
                set department = '테스트학과',
                    publication_consent = true,
                    publication_consented_at = '2026-07-01T12:00:00'
                where id = 1
                """
        );
        MigrationUpgradeHarness.execute(
                dbUrl,
                """
                update staff
                set student_id = '2026000002',
                    phone = '01000000002',
                    publication_consent = true,
                    publication_consented_at = '2026-07-01T12:00:00'
                where id = 1
                """
        );

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            assertThat(value(statement, "select department from members where id = 1"))
                    .isEqualTo("테스트학과");
            assertThat(value(statement, "select student_id from staff where id = 1"))
                    .isEqualTo("2026000002");
        }
    }

    private String value(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            return result.getString(1);
        }
    }
}
