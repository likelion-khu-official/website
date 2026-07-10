package likelion.khu.website.admin;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class AdminTest {

    @Test
    void recordFailedLogin_BelowThreshold_DoesNotLock() {
        Admin admin = Admin.register("a@khu.ac.kr", "이름", "hash", AdminRole.ADMIN);

        admin.recordFailedLogin(5, Duration.ofMinutes(15));

        assertThat(admin.isLocked()).isFalse();
        assertThat(admin.getFailedLoginAttempts()).isEqualTo(1);
    }

    @Test
    void recordFailedLogin_ReachesThreshold_Locks() {
        Admin admin = Admin.register("a@khu.ac.kr", "이름", "hash", AdminRole.ADMIN);

        for (int i = 0; i < 5; i++) {
            admin.recordFailedLogin(5, Duration.ofMinutes(15));
        }

        assertThat(admin.isLocked()).isTrue();
    }

    @Test
    void recordSuccessfulLogin_ResetsCounterAndUnlocks() {
        Admin admin = Admin.register("a@khu.ac.kr", "이름", "hash", AdminRole.ADMIN);
        for (int i = 0; i < 5; i++) {
            admin.recordFailedLogin(5, Duration.ofMinutes(15));
        }

        admin.recordSuccessfulLogin();

        assertThat(admin.isLocked()).isFalse();
        assertThat(admin.getFailedLoginAttempts()).isZero();
    }

    @Test
    void changeRole_UpdatesRole() {
        Admin admin = Admin.register("a@khu.ac.kr", "이름", "hash", AdminRole.ADMIN);

        admin.changeRole(AdminRole.SUPER_ADMIN);

        assertThat(admin.getRole()).isEqualTo(AdminRole.SUPER_ADMIN);
    }

    @Test
    void changePassword_UpdatesHash() {
        Admin admin = Admin.register("a@khu.ac.kr", "이름", "old-hash", AdminRole.ADMIN);

        admin.changePassword("new-hash");

        assertThat(admin.getPasswordHash()).isEqualTo("new-hash");
    }
}
