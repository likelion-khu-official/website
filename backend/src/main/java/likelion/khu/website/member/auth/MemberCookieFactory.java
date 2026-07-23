package likelion.khu.website.member.auth;

import likelion.khu.website.admin.auth.AdminCookieFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

// admin.auth.AdminCookieFactory와 같은 모양 — access_token은 이름·Path(/)가 같아 그대로 겹쳐 써도
// 무방하지만, refresh_token은 Path를 /api/member/auth로 좁혀 어드민 refresh 흐름과 분리한다.
@Component
public class MemberCookieFactory {

    private static final String REFRESH_TOKEN_PATH = "/api/member/auth";

    @Value("${app.cookie-secure:true}")
    private boolean cookieSecure;

    @Value("${jwt.access-expiration}")
    private long accessExpirationMs;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;

    public ResponseCookie accessTokenCookie(String token) {
        return build(AdminCookieFactory.ACCESS_TOKEN_COOKIE, token, "/", Duration.ofMillis(accessExpirationMs));
    }

    public ResponseCookie refreshTokenCookie(String token) {
        return build(AdminCookieFactory.REFRESH_TOKEN_COOKIE, token, REFRESH_TOKEN_PATH, Duration.ofMillis(refreshExpirationMs));
    }

    public ResponseCookie clearedAccessTokenCookie() {
        return build(AdminCookieFactory.ACCESS_TOKEN_COOKIE, "", "/", Duration.ZERO);
    }

    public ResponseCookie clearedRefreshTokenCookie() {
        return build(AdminCookieFactory.REFRESH_TOKEN_COOKIE, "", REFRESH_TOKEN_PATH, Duration.ZERO);
    }

    private ResponseCookie build(String name, String value, String path, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
