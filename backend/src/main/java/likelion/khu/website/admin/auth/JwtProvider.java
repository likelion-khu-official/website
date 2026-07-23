package likelion.khu.website.admin.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import likelion.khu.website.admin.Admin;
import likelion.khu.website.member.Member;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtProvider {

    // CLAIM_EMAIL은 이름과 달리 "로그인 식별자" 범용 클레임이다 — 어드민은 이메일, 멤버는 학번이 들어간다.
    // JwtAuthenticationFilter·AdminPrincipal을 그대로 재사용하기 위해 클레임 키 자체는 안 바꿨다.
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TYPE = "typ";
    private static final String CLAIM_MUST_CHANGE_PASSWORD = "mcp";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";
    // public: MemberAccountResponse가 로그인 응답 바디에 내려주는 role 값도 이 상수와 같은 값이어야
    // 하므로(JWT 클레임과 응답 바디가 따로 놀면 안 됨) 단일 출처로 공유한다.
    public static final String MEMBER_ROLE = "MEMBER";

    private final SecretKey key;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;

    public JwtProvider(@Value("${jwt.secret}") String secret,
                        @Value("${jwt.access-expiration}") long accessExpirationMs,
                        @Value("${jwt.refresh-expiration}") long refreshExpirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpirationMs = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    public long getAccessExpirationMs() {
        return accessExpirationMs;
    }

    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }

    public String createAccessToken(Admin admin) {
        return buildToken(admin.getId(), admin.getEmail(), admin.getRole().name(), false, TYPE_ACCESS, accessExpirationMs);
    }

    public String createRefreshToken(Admin admin) {
        return buildToken(admin.getId(), admin.getEmail(), admin.getRole().name(), false, TYPE_REFRESH, refreshExpirationMs);
    }

    public String createAccessToken(Member member) {
        return buildToken(member.getId(), member.getStudentId(), MEMBER_ROLE, member.isMustChangePassword(), TYPE_ACCESS, accessExpirationMs);
    }

    public String createRefreshToken(Member member) {
        return buildToken(member.getId(), member.getStudentId(), MEMBER_ROLE, member.isMustChangePassword(), TYPE_REFRESH, refreshExpirationMs);
    }

    // typ 클레임으로 access/refresh를 구분 — 이게 없으면 refresh 토큰을 access 쿠키에 넣거나
    // 반대로 재생하는 걸 서명 검증만으로는 막을 수 없다. 필터와 /refresh 양쪽에서 각각 명시적으로 확인한다.
    public Optional<Claims> parseClaims(String token) {
        try {
            return Optional.of(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public boolean isAccessToken(Claims claims) {
        return TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public LocalDateTime expirationOf(Claims claims) {
        return LocalDateTime.ofInstant(claims.getExpiration().toInstant(), ZoneId.systemDefault());
    }

    private String buildToken(Long id, String loginIdentifier, String role, boolean mustChangePassword,
                               String type, long expirationMs) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(id))
                .claim(CLAIM_EMAIL, loginIdentifier)
                .claim(CLAIM_ROLE, role)
                .claim(CLAIM_MUST_CHANGE_PASSWORD, mustChangePassword)
                .claim(CLAIM_TYPE, type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }
}
