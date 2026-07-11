package likelion.khu.website.admin.auth;

import io.jsonwebtoken.Claims;
import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.dto.AdminSessionResponse;
import likelion.khu.website.admin.exception.AccountLockedException;
import likelion.khu.website.admin.exception.InvalidCredentialsException;
import likelion.khu.website.admin.exception.InvalidRefreshTokenException;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminRepository adminRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Value("${admin.lockout.max-attempts:5}")
    private int maxAttempts;

    @Value("${admin.lockout.duration-minutes:15}")
    private long lockoutDurationMinutes;

    @Getter
    @AllArgsConstructor
    public static class LoginResult {
        private final AdminSessionResponse session;
        private final String accessToken;
        private final String refreshToken;
    }

    // noRollbackFor 필수: 실패 로그인 시 recordFailedLogin()으로 늘린 시도횟수·잠금을 남긴 채로
    // InvalidCredentialsException/AccountLockedException을 던져야 하는데, 기본 정책은 unchecked
    // 예외에서 전체 롤백이라 이 카운터 증가 자체가 롤백돼 무차별 대입 방어가 무력화된다.
    @Transactional(noRollbackFor = {InvalidCredentialsException.class, AccountLockedException.class})
    public LoginResult login(String email, String rawPassword) {
        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (admin.isLocked()) {
            throw new AccountLockedException();
        }

        if (!passwordEncoder.matches(rawPassword, admin.getPasswordHash())) {
            admin.recordFailedLogin(maxAttempts, Duration.ofMinutes(lockoutDurationMinutes));
            if (admin.isLocked()) {
                throw new AccountLockedException();
            }
            throw new InvalidCredentialsException();
        }

        admin.recordSuccessfulLogin();
        return issueTokenPair(admin);
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null) {
            return;
        }
        refreshTokenRepository.findByTokenHash(hash(refreshToken)).ifPresent(RefreshToken::revoke);
    }

    // access 토큰만 새로 발급 — refresh 토큰 자체는 로테이션하지 않고 만료까지 재사용한다(계획에 명시된 트레이드오프).
    @Transactional
    public LoginResult refresh(String refreshToken) {
        if (refreshToken == null) {
            throw new InvalidRefreshTokenException();
        }
        Claims claims = jwtProvider.parseClaims(refreshToken)
                .filter(jwtProvider::isRefreshToken)
                .orElseThrow(InvalidRefreshTokenException::new);

        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(refreshToken))
                .filter(RefreshToken::isValid)
                .orElseThrow(InvalidRefreshTokenException::new);

        Admin admin = adminRepository.findById(Long.valueOf(claims.getSubject()))
                .filter(a -> a.getId().equals(stored.getAdminId()))
                .orElseThrow(InvalidRefreshTokenException::new);

        String accessToken = jwtProvider.createAccessToken(admin);
        return new LoginResult(AdminSessionResponse.from(admin), accessToken, refreshToken);
    }

    // 비밀번호 재설정·역할변경·계정삭제 시 호출 — 이미 발급된 access 토큰(스테이트리스, 최대 15분 잔여)은
    // 못 끊지만, refresh 경로는 즉시 닫는다.
    @Transactional
    public void revokeAllTokensFor(Long adminId) {
        refreshTokenRepository.findAllByAdminIdAndRevokedFalse(adminId)
                .forEach(RefreshToken::revoke);
    }

    private LoginResult issueTokenPair(Admin admin) {
        String accessToken = jwtProvider.createAccessToken(admin);
        String refreshToken = jwtProvider.createRefreshToken(admin);
        LocalDateTime expiresAt = LocalDateTime.now().plus(Duration.ofMillis(jwtProvider.getRefreshExpirationMs()));
        refreshTokenRepository.save(RefreshToken.issue(admin.getId(), hash(refreshToken), expiresAt));
        return new LoginResult(AdminSessionResponse.from(admin), accessToken, refreshToken);
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없어요.", e);
        }
    }
}
