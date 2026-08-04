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

class MemberPublicationDefaultUpgradeTest {

    @TempDir Path tempDir;

    @Test
    void existingActiveMemberBecomesPublicButOffboardedMemberStaysPrivate() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("member-publication-default-upgrade.db");
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260802160000");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into members (
                    cohort, failed_login_attempts, must_change_password, id, created_at, created_by,
                    emoji, join_reason, locked_until, name, offboarded_at, password_hash, phone,
                    photo_url, student_id, updated_at, updated_by, department,
                    publication_consent, publication_consented_at
                ) values
                  (14, 0, true, 1, '1785826800000', 'admin@example.com',
                   '🦁', null, null, '활성멤버', null, 'hash', '01000000001',
                   null, '2026000001', '1785826800000', 'admin@example.com', null, false, null),
                  (13, 0, true, 2, '1754290800000', 'admin@example.com',
                   '🐯', null, null, '과거멤버', '1785740400000', 'hash', '01000000002',
                   null, '2025000002', '1785740400000', 'admin@example.com', null, false, null)
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement();
             ResultSet members = statement.executeQuery("""
                     select id, publication_consent, publication_consented_at
                     from members
                     order by id
                     """)) {
            assertThat(members.next()).isTrue();
            assertThat(members.getLong("id")).isEqualTo(1L);
            assertThat(members.getBoolean("publication_consent")).isTrue();
            assertThat(members.getString("publication_consented_at")).matches("\\d{13}");

            assertThat(members.next()).isTrue();
            assertThat(members.getLong("id")).isEqualTo(2L);
            assertThat(members.getBoolean("publication_consent")).isFalse();
            assertThat(members.getString("publication_consented_at")).isNull();
            assertThat(members.next()).isFalse();
        }
    }
}
