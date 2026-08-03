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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V8이 admins.role 컬럼(과 그 CHECK 제약)을 제거하면서도 기존 관리자 행을 그대로
 * 보존하는지 검증한다 — 테이블 재생성 패턴(새 테이블 생성 → 데이터 복사 → 기존 테이블
 * DROP → RENAME)이라 복사할 컬럼 목록을 하나라도 빠뜨리면 그 값이 조용히 유실된다.
 */
class AdminRoleDropUpgradeTest {

    @TempDir
    Path tempDir;

    @Test
    void v8DropsRoleColumnButPreservesExistingAdminRows() throws SQLException {
        String dbUrl = "jdbc:sqlite:" + tempDir.resolve("admin-role-drop.db");

        // V7까지만 적용 — 이 마이그레이션이 배포되기 직전의 실제 stage/prod 상태(role 컬럼 존재).
        MigrationUpgradeHarness.migrateTo(dbUrl, "7");
        MigrationUpgradeHarness.execute(dbUrl, """
                insert into admins (
                    id, email, password_hash, name, role,
                    failed_login_attempts, locked_until, created_at, updated_at
                ) values (
                    1, 'existing@khu.ac.kr', 'hash', '기존관리자', 'SUPER_ADMIN',
                    2, '2026-01-01T00:00:00', '2026-01-01T00:00:00', '2026-01-01T00:00:00'
                )
                """);

        MigrationUpgradeHarness.migrateToLatest(dbUrl);

        try (Connection connection = DriverManager.getConnection(dbUrl);
             Statement statement = connection.createStatement()) {

            // role 컬럼 자체가 사라졌어야 한다 — 남아있으면 이 조회가 성공해버린다.
            assertThatThrownBy(() -> statement.executeQuery("select role from admins"))
                    .as("role 컬럼은 V8 이후 존재하지 않아야 함")
                    .isInstanceOf(SQLException.class);

            assertThat(count(statement, "select count(*) from admins"))
                    .as("기존 관리자 행이 유실되지 않아야 함")
                    .isEqualTo(1);
            assertThat(value(statement, "select email from admins where id = 1"))
                    .isEqualTo("existing@khu.ac.kr");
            assertThat(value(statement, "select password_hash from admins where id = 1"))
                    .isEqualTo("hash");
            assertThat(value(statement, "select name from admins where id = 1"))
                    .isEqualTo("기존관리자");
            assertThat(value(statement, "select failed_login_attempts from admins where id = 1"))
                    .isEqualTo("2");
            assertThat(value(statement, "select locked_until from admins where id = 1"))
                    .isEqualTo("2026-01-01T00:00:00");
            assertThat(value(statement, "select created_at from admins where id = 1"))
                    .isEqualTo("2026-01-01T00:00:00");
            assertThat(value(statement, "select updated_at from admins where id = 1"))
                    .isEqualTo("2026-01-01T00:00:00");
        }
    }

    private String value(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getString(1);
        }
    }

    private int count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }
}
