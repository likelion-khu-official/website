package likelion.khu.website.member.auth;

import io.jsonwebtoken.Claims;
import likelion.khu.website.admin.AdminPasswordPolicy;
import likelion.khu.website.admin.auth.JwtProvider;
import likelion.khu.website.admin.exception.AccountLockedException;
import likelion.khu.website.admin.exception.InvalidCredentialsException;
import likelion.khu.website.admin.exception.InvalidRefreshTokenException;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.auth.dto.MemberSessionResponse;
import likelion.khu.website.member.exception.MemberNotFoundException;
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

// admin.auth.AdminAuthService와 같은 로그인/JWT/쿠키 로직을 멤버(학번 로그인)용으로 그대로 반복한다.
// #117 계획대로 admins/refresh_tokens 테이블은 건드리지 않고 나란히 둔다.
@Service
@RequiredArgsConstructor
public class MemberAuthService {

    private final MemberRepository memberRepository;
    private final MemberRefreshTokenRepository memberRefreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Value("${admin.lockout.max-attempts:5}")
    private int maxAttempts;

    @Value("${admin.lockout.duration-minutes:15}")
    private long lockoutDurationMinutes;

    @Getter
    @AllArgsConstructor
    public static class LoginResult {
        private final MemberSessionResponse session;
        private final String accessToken;
        private final String refreshToken;
    }

    @Transactional(noRollbackFor = {InvalidCredentialsException.class, AccountLockedException.class})
    public LoginResult login(String studentId, String rawPassword) {
        Member member = memberRepository.findByStudentId(studentId)
                .orElseThrow(() -> new InvalidCredentialsException("학번 또는 비밀번호가 올바르지 않아요."));

        if (member.isLocked()) {
            throw new AccountLockedException();
        }

        if (!passwordEncoder.matches(rawPassword, member.getPasswordHash())) {
            member.recordFailedLogin(maxAttempts, Duration.ofMinutes(lockoutDurationMinutes));
            if (member.isLocked()) {
                throw new AccountLockedException();
            }
            throw new InvalidCredentialsException("학번 또는 비밀번호가 올바르지 않아요.");
        }

        member.recordSuccessfulLogin();
        return issueTokenPair(member);
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null) {
            return;
        }
        memberRefreshTokenRepository.findByTokenHash(hash(refreshToken)).ifPresent(MemberRefreshToken::revoke);
    }

    @Transactional
    public LoginResult refresh(String refreshToken) {
        if (refreshToken == null) {
            throw new InvalidRefreshTokenException();
        }
        Claims claims = jwtProvider.parseClaims(refreshToken)
                .filter(jwtProvider::isRefreshToken)
                .orElseThrow(InvalidRefreshTokenException::new);

        MemberRefreshToken stored = memberRefreshTokenRepository.findByTokenHash(hash(refreshToken))
                .filter(MemberRefreshToken::isValid)
                .orElseThrow(InvalidRefreshTokenException::new);

        Member member = memberRepository.findById(Long.valueOf(claims.getSubject()))
                .filter(m -> m.getId().equals(stored.getMemberId()))
                .orElseThrow(InvalidRefreshTokenException::new);

        String accessToken = jwtProvider.createAccessToken(member);
        return new LoginResult(MemberSessionResponse.from(member), accessToken, refreshToken);
    }

    // 본인이 직접 바꾸는 경우(첫 로그인 강제 변경 포함). currentPassword를 확인해야 로그인된
    // 기기를 잠깐 빌린 제3자가 새 비번으로 계정을 영구 탈취하는 걸 막을 수 있다 — 첫 로그인 화면에서도
    // FE가 사용자에게 다시 물을 필요는 없다. 로그인 때 이미 입력받은 값(초기값=전화번호)을 그대로
    // 실어 보내면 되므로, 사용자 눈엔 "새 비밀번호" 입력창 하나만 보인다.
    // access 토큰은 발급 시점 클레임을 그대로 담고 있어 DB의 mustChangePassword를 내려도 이미 나간
    // 토큰엔 반영이 안 된다 — 그래서 기존 세션(다른 기기 포함)은 전부 끊고, 방금 요청한 세션에는
    // mcp=false가 반영된 새 토큰 쌍을 바로 발급해 다시 로그인할 필요가 없게 한다.
    @Transactional
    public LoginResult changePassword(Long memberId, String currentRawPassword, String newRawPassword) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(MemberNotFoundException::new);
        if (!passwordEncoder.matches(currentRawPassword, member.getPasswordHash())) {
            throw new InvalidCredentialsException("현재 비밀번호가 올바르지 않아요.");
        }
        AdminPasswordPolicy.validate(newRawPassword);
        member.changePassword(passwordEncoder.encode(newRawPassword));
        revokeAllTokensFor(member.getId());
        return issueTokenPair(member);
    }

    // 관리자(ADMIN 이상)가 분실 비밀번호를 초기화 — 전화번호로 되돌리고 다시 첫 로그인 상태로 만든다(재설정 메일 없음).
    @Transactional
    public void resetPasswordByAdmin(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(MemberNotFoundException::new);
        member.resetPasswordByAdmin(passwordEncoder.encode(member.getPhone()));
        revokeAllTokensFor(member.getId());
    }

    private void revokeAllTokensFor(Long memberId) {
        memberRefreshTokenRepository.findAllByMemberIdAndRevokedFalse(memberId)
                .forEach(MemberRefreshToken::revoke);
    }

    private LoginResult issueTokenPair(Member member) {
        String accessToken = jwtProvider.createAccessToken(member);
        String refreshToken = jwtProvider.createRefreshToken(member);
        LocalDateTime expiresAt = LocalDateTime.now().plus(Duration.ofMillis(jwtProvider.getRefreshExpirationMs()));
        memberRefreshTokenRepository.save(MemberRefreshToken.issue(member.getId(), hash(refreshToken), expiresAt));
        return new LoginResult(MemberSessionResponse.from(member), accessToken, refreshToken);
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
