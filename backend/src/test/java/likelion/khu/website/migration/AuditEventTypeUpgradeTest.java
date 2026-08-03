package likelion.khu.website.migration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** 기존 감사 행의 의미 필드를 건드리지 않고 새 업무 영역 분류만 채우는지 검증한다. */
class AuditEventTypeUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void migrationClassifiesExistingEventsWithoutChangingOriginalFields() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("audit-event-type-upgrade.db");

        MigrationUpgradeHarness.migrateTo(dbUrl, "20260731150000");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into audit_events (
                    id, actor_type, action, summary, target_type, target_id, http_method, path, outcome, occurred_at
                ) values
                    (1, 'ADMIN', 'STATE_CHANGE', '멤버 오프보딩', 'MEMBER', 12, null, null, 'SUCCESS', '2026-08-01T10:00:00'),
                    (2, 'ADMIN', 'SENSITIVE_READ', null, null, null, 'GET', '/api/admin/audit-logs', 'SUCCESS', '2026-08-01T10:01:00');
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {
            assertThat(eventTypes(statement)).containsExactly(
                    Map.entry(1L, "PEOPLE_MANAGEMENT"),
                    Map.entry(2L, "AUDIT_REVIEW"));
            assertThat(value(statement, "select summary from audit_events where id = 1"))
                    .isEqualTo("멤버 오프보딩");
            assertThat(value(statement, "select target_id from audit_events where id = 1"))
                    .isEqualTo("12");
        }
    }

    private Map<Long, String> eventTypes(Statement statement) throws SQLException {
        Map<Long, String> result = new LinkedHashMap<>();
        try (ResultSet rows = statement.executeQuery("select id, event_type from audit_events order by id")) {
            while (rows.next()) {
                result.put(rows.getLong(1), rows.getString(2));
            }
        }
        return result;
    }

    private String value(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            return result.getString(1);
        }
    }
}
