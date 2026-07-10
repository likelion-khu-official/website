package likelion.khu.website.admin.auth;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenTest {

    @Test
    void isValid_FreshNotRevoked_ReturnsTrue() {
        RefreshToken token = RefreshToken.issue(1L, "hash", LocalDateTime.now().plusDays(7));

        assertThat(token.isValid()).isTrue();
    }

    @Test
    void isValid_Revoked_ReturnsFalse() {
        RefreshToken token = RefreshToken.issue(1L, "hash", LocalDateTime.now().plusDays(7));

        token.revoke();

        assertThat(token.isValid()).isFalse();
    }

    @Test
    void isValid_Expired_ReturnsFalse() {
        RefreshToken token = RefreshToken.issue(1L, "hash", LocalDateTime.now().minusMinutes(1));

        assertThat(token.isValid()).isFalse();
    }
}
