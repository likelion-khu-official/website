package likelion.khu.website.feed.comment;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
public class CommentTrackingService {

    public static final String COOKIE_NAME = "comment_actor";

    @Value("${comment.tracking-secret:${jwt.secret}}")
    private String trackingSecret;

    @Value("${app.cookie-secure:true}")
    private boolean cookieSecure;

    public TrackingResult resolve(HttpServletRequest request) {
        String token = null;
        if (request.getCookies() != null) {
            for (var cookie : request.getCookies()) {
                if (COOKIE_NAME.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        boolean issued = token == null;
        if (issued) {
            token = UUID.randomUUID().toString();
        }

        String actorId = hmac("actor:" + token);
        String ipHash = hmac("ip:" + request.getRemoteAddr());
        String userAgent = classifyUserAgent(request.getHeader("User-Agent"));
        return new TrackingResult(actorId, ipHash, userAgent, issued ? actorCookie(token) : null);
    }

    private ResponseCookie actorCookie(String token) {
        return ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofDays(180))
                .build();
    }

    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(trackingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("댓글 추적 식별자를 만들지 못했어요.", e);
        }
    }

    private String classifyUserAgent(String value) {
        if (value == null || value.isBlank()) return "알 수 없음";
        String ua = value.toLowerCase(Locale.ROOT);
        String device = ua.contains("mobile") || ua.contains("android") || ua.contains("iphone")
                ? "모바일" : "데스크톱";
        String browser;
        if (ua.contains("edg/")) browser = "Edge";
        else if (ua.contains("chrome/")) browser = "Chrome";
        else if (ua.contains("safari/")) browser = "Safari";
        else if (ua.contains("firefox/")) browser = "Firefox";
        else browser = "기타 브라우저";
        return device + " · " + browser;
    }

    public record TrackingResult(
            String actorId,
            String ipHash,
            String userAgent,
            ResponseCookie cookie
    ) {}
}
