package likelion.khu.website.admin.password;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetTokenTest {

    @Test
    void issue_SetsUnusedAndNotExpired() {
        PasswordResetToken token = PasswordResetToken.issue(1L, "token", Duration.ofMinutes(30));

        assertThat(token.isUsed()).isFalse();
        assertThat(token.isExpired()).isFalse();
    }

    @Test
    void markUsed_SetsUsedTrue() {
        PasswordResetToken token = PasswordResetToken.issue(1L, "token", Duration.ofMinutes(30));

        token.markUsed();

        assertThat(token.isUsed()).isTrue();
    }

    @Test
    void isExpired_PastExpiry_ReturnsTrue() {
        PasswordResetToken token = PasswordResetToken.issue(1L, "token", Duration.ofMillis(-1));

        assertThat(token.isExpired()).isTrue();
    }
}
