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
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * V20260730201735가 email_log.email_type의 CHECK 제약을 넓혀서(RECRUITMENT_OPEN 추가)
 * 기존 행을 보존하면서 새 값도 받아들이는지 검증한다.
 *
 * 이 값을 빠뜨린 채 실제 stage/prod에 방치돼 있던 경위는 마이그레이션 파일 주석 및
 * db-man 스킬 7번("enum 값 추가/변경은 validate도 로컬 테스트도 못 잡는다") 참고.
 */
class EmailLogEmailTypeCheckWideningUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void widensCheckWithoutLosingExistingRows() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("email-log-check-widen.db");

        // 이 마이그레이션 배포 직전 상태(V20260730133717까지) 재현 — 이 시점 CHECK는
        // INVITE/PASSWORD_RESET 두 값뿐이라 RECRUITMENT_OPEN을 심으면 여기서 바로 실패한다.
        MigrationUpgradeHarness.migrateTo(dbUrl, "20260730133717");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into email_log (id, email_type, recipient, subject, status, sent_at, message_id, failure_cause)
                values (1, 'INVITE', 'a@example.com', '초대', 'SUCCESS', '2026-01-01T00:00:00', 'msg-1', null)
                """);
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into email_log (id, email_type, recipient, subject, status, sent_at, error_message, failure_cause)
                values (2, 'PASSWORD_RESET', 'b@example.com', '재설정', 'FAILURE', '2026-01-02T00:00:00', 'smtp down', 'SMTP_CONNECTION_FAILED')
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {

            // 기존 행이 재생성 과정에서 유실되지 않았는지
            assertThat(count(statement, "select count(*) from email_log where id = 1 and email_type = 'INVITE'"))
                    .isEqualTo(1);
            assertThat(count(statement,
                    "select count(*) from email_log where id = 2 and failure_cause = 'SMTP_CONNECTION_FAILED'"))
                    .isEqualTo(1);

            // 이 마이그레이션의 목적: RECRUITMENT_OPEN이 이제 CHECK 위반 없이 들어간다
            assertThatCode(() -> statement.execute("""
                    insert into email_log (id, email_type, recipient, subject, status, sent_at, message_id)
                    values (3, 'RECRUITMENT_OPEN', 'c@example.com', '모집 시작', 'SUCCESS', '2026-01-03T00:00:00', 'msg-3')
                    """)).doesNotThrowAnyException();

            assertThat(count(statement, "select count(*) from email_log")).isEqualTo(3);
        }
    }

    private int count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }
}
