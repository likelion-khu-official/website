package likelion.khu.website.admin.auth;

import io.jsonwebtoken.Claims;
import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRole;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class JwtProviderTest {

    private final JwtProvider jwtProvider = new JwtProvider(
            "test-secret-key-for-unit-test-must-be-at-least-32-characters-long", 900000L, 604800000L);

    private final Admin admin = admin();

    private static Admin admin() {
        Admin admin = Admin.register("a@khu.ac.kr", "이름", "hash", AdminRole.SUPER_ADMIN);
        ReflectionTestUtils.setField(admin, "id", 42L);
        return admin;
    }

    @Test
    void createAccessToken_ParsesBackWithSameClaimsAndAccessType() {
        String token = jwtProvider.createAccessToken(admin);

        Claims claims = jwtProvider.parseClaims(token).orElseThrow();

        assertThat(claims.getSubject()).isEqualTo("42");
        assertThat(claims.get("email", String.class)).isEqualTo(admin.getEmail());
        assertThat(claims.get("role", String.class)).isEqualTo(admin.getRole().name());
        assertThat(jwtProvider.isAccessToken(claims)).isTrue();
        assertThat(jwtProvider.isRefreshToken(claims)).isFalse();
    }

    @Test
    void createRefreshToken_MarkedAsRefreshType() {
        String token = jwtProvider.createRefreshToken(admin);

        Claims claims = jwtProvider.parseClaims(token).orElseThrow();

        assertThat(jwtProvider.isRefreshToken(claims)).isTrue();
        assertThat(jwtProvider.isAccessToken(claims)).isFalse();
    }

    @Test
    void parseClaims_TamperedToken_ReturnsEmpty() {
        String token = jwtProvider.createAccessToken(admin);

        Optional<Claims> result = jwtProvider.parseClaims(token + "tampered");

        assertThat(result).isEmpty();
    }

    @Test
    void parseClaims_MalformedToken_ReturnsEmpty() {
        assertThat(jwtProvider.parseClaims("not-a-jwt")).isEmpty();
    }
}
