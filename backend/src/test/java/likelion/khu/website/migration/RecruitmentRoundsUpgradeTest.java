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

class RecruitmentRoundsUpgradeTest {

    @TempDir Path tempDir;

    @Test
    void existingApplicationsBecomeOneRecoverableLatestRound() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("recruitment-round-upgrade.db");
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260802120000");
        MigrationUpgradeHarness.execute(dbUrl, """
                update recruitment_status
                set open = false, opened_at = '2026-07-01T09:00:00'
                where id = 1
                """);
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into applications (id, schema_snapshot_json, answers_json, submitted_at)
                values
                  (1, '{}', '{"name":"A"}', '2026-07-02T10:00:00'),
                  (2, '{}', '{"name":"B"}', '2026-07-03T11:00:00')
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            ResultSet round = statement.executeQuery(
                    "select id, opened_at, closed_at from recruitment_rounds");
            assertThat(round.next()).isTrue();
            long roundId = round.getLong("id");
            assertThat(round.getString("opened_at")).isEqualTo("2026-07-01T09:00:00");
            assertThat(round.getString("closed_at")).isEqualTo("2026-07-03T11:00:00");
            assertThat(round.next()).isFalse();

            ResultSet status = statement.executeQuery(
                    "select current_round_id from recruitment_status where id = 1");
            assertThat(status.next()).isTrue();
            assertThat(status.getLong("current_round_id")).isEqualTo(roundId);

            ResultSet applications = statement.executeQuery(
                    "select count(*) as count from applications where recruitment_round_id = " + roundId);
            assertThat(applications.next()).isTrue();
            assertThat(applications.getLong("count")).isEqualTo(2);
        }
    }

    @Test
    void openRecruitmentDoesNotAbsorbApplicationsFromBeforeItsOpeningDate() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("open-recruitment-round-upgrade.db");
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260802120000");
        MigrationUpgradeHarness.execute(dbUrl, """
                update recruitment_status
                set open = true, opened_at = '2026-08-01T09:00:00'
                where id = 1
                """);
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into applications (id, schema_snapshot_json, answers_json, submitted_at)
                values
                  (1, '{}', '{"name":"old"}', '2026-07-03T11:00:00'),
                  (2, '{}', '{"name":"current"}', '2026-08-02T10:00:00')
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            ResultSet rounds = statement.executeQuery(
                    "select id, opened_at, closed_at from recruitment_rounds order by id");
            assertThat(rounds.next()).isTrue();
            long previousRoundId = rounds.getLong("id");
            assertThat(rounds.getString("closed_at")).isEqualTo("2026-07-03T11:00:00");
            assertThat(rounds.next()).isTrue();
            long currentRoundId = rounds.getLong("id");
            assertThat(rounds.getString("opened_at")).isEqualTo("2026-08-01T09:00:00");
            assertThat(rounds.getString("closed_at")).isNull();

            ResultSet previousCount = statement.executeQuery(
                    "select count(*) as count from applications where recruitment_round_id = " + previousRoundId);
            assertThat(previousCount.next()).isTrue();
            assertThat(previousCount.getLong("count")).isEqualTo(1);

            ResultSet currentCount = statement.executeQuery(
                    "select count(*) as count from applications where recruitment_round_id = " + currentRoundId);
            assertThat(currentCount.next()).isTrue();
            assertThat(currentCount.getLong("count")).isEqualTo(1);

            ResultSet status = statement.executeQuery(
                    "select current_round_id from recruitment_status where id = 1");
            assertThat(status.next()).isTrue();
            assertThat(status.getLong("current_round_id")).isEqualTo(currentRoundId);
        }
    }
}
