package likelion.khu.website.admin.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class AdminCookieFactory {

    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";
    private static final String REFRESH_TOKEN_PATH = "/api/admin/auth";

    // 로컬 개발(HTTP)에서만 false 허용 — stage/prod는 반드시 true(HTTPS 전제)
    @Value("${app.cookie-secure:true}")
    private boolean cookieSecure;

    @Value("${jwt.access-expiration}")
    private long accessExpirationMs;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;

    public ResponseCookie accessTokenCookie(String token) {
        return build(ACCESS_TOKEN_COOKIE, token, "/", Duration.ofMillis(accessExpirationMs));
    }

    public ResponseCookie refreshTokenCookie(String token) {
        return build(REFRESH_TOKEN_COOKIE, token, REFRESH_TOKEN_PATH, Duration.ofMillis(refreshExpirationMs));
    }

    public ResponseCookie clearedAccessTokenCookie() {
        return build(ACCESS_TOKEN_COOKIE, "", "/", Duration.ZERO);
    }

    public ResponseCookie clearedRefreshTokenCookie() {
        return build(REFRESH_TOKEN_COOKIE, "", REFRESH_TOKEN_PATH, Duration.ZERO);
    }

    private ResponseCookie build(String name, String value, String path, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                // Strict — 이 어드민 패널을 크로스사이트 top-level 내비게이션으로 열 정당한 시나리오가 없어
                // CSRF 토큰 없이도 이 쿠키가 크로스사이트 요청에 실리는 걸 원천 차단.
                .sameSite("Strict")
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
