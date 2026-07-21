package likelion.khu.website.admin.password;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminPasswordPolicy;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.auth.AdminAuthService;
import likelion.khu.website.admin.exception.AdminNotFoundException;
import likelion.khu.website.admin.exception.PasswordResetTokenExpiredException;
import likelion.khu.website.admin.exception.PasswordResetTokenNotFoundException;
import likelion.khu.website.admin.password.dto.AdminPasswordVerifyResponse;
import likelion.khu.website.email.EmailService;
import likelion.khu.website.email.exception.EmailSendException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminPasswordResetService {

    private static final Duration TTL = Duration.ofMinutes(30);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String FORGOT_MESSAGE = "메일이 발송되었어요.";

    private final PasswordResetTokenRepository tokenRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AdminAuthService adminAuthService;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    // 이메일 존재 여부와 무관하게 완전히 동일한 메시지를 응답 — 등록 여부 자체를 흘리지 않기 위함(#90 스펙).
    // SMTP 장애로 발송 자체가 실패해도 이 불변식은 그대로 지켜야 한다(#123 리뷰, ParkIlha) — 상태 코드가
    // 갈리면(성공 200 vs 실패 502) 그 자체가 "존재하는 이메일인지"를 흘리는 사이드채널이 된다(#70과 동일 계열).
    // 그래서 EmailSendException은 여기서 삼키고 항상 같은 메시지로 응답한다.
    @Transactional
    public String forgot(String email) {
        Optional<Admin> admin = adminRepository.findByEmail(email);
        admin.ifPresent(this::issueAndSendResetTokenSwallowingEmailFailure);
        return FORGOT_MESSAGE;
    }

    // email_log FAILURE 기록은 EmailService가 트랜잭션 결과와 무관하게(AFTER_COMPLETION) 남기므로
    // 여기서 예외를 삼켜도 유실되지 않는다 — 자세한 이유는 EmailLogEventListener 클래스 주석 참고.
    // 토큰은 발송 실패 시엔 여전히 남으면 안 되므로(재시도가 멱등하게 새 토큰을 받도록) 예외를
    // 되던지는 대신 현재 트랜잭션만 rollback-only로 표시한다 — 응답은 그대로 정상 반환.
    private void issueAndSendResetTokenSwallowingEmailFailure(Admin admin) {
        try {
            issueAndSendResetToken(admin);
        } catch (EmailSendException e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
    }

    // 시드 러너에서도 재사용 — "가입 + 비밀번호 설정 메일"로 SUPER_ADMIN을 시딩하기 위함.
    @Transactional
    public void issueAndSendResetToken(Admin admin) {
        String token = generateToken();
        PasswordResetToken resetToken = tokenRepository.save(
                PasswordResetToken.issue(admin.getId(), token, TTL));
        String resetUrl = frontendBaseUrl + "/admin/reset-password/" + token;
        emailService.sendPasswordResetEmail(admin.getEmail(), resetUrl, resetToken.getExpiresAt());
    }

    @Transactional(readOnly = true)
    public AdminPasswordVerifyResponse verify(String token) {
        PasswordResetToken resetToken = findValidByToken(token);
        Admin admin = adminRepository.findById(resetToken.getAdminId())
                .orElseThrow(AdminNotFoundException::new);
        return new AdminPasswordVerifyResponse(admin.getEmail());
    }

    @Transactional
    public void reset(String token, String newPassword) {
        PasswordResetToken resetToken = findValidByToken(token);
        AdminPasswordPolicy.validate(newPassword);

        Admin admin = adminRepository.findById(resetToken.getAdminId())
                .orElseThrow(AdminNotFoundException::new);

        admin.changePassword(passwordEncoder.encode(newPassword));
        resetToken.markUsed();
        adminAuthService.revokeAllTokensFor(admin.getId());
    }

    private PasswordResetToken findValidByToken(String token) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(PasswordResetTokenNotFoundException::new);
        if (resetToken.isUsed()) {
            throw new PasswordResetTokenNotFoundException();
        }
        if (resetToken.isExpired()) {
            throw new PasswordResetTokenExpiredException();
        }
        return resetToken;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
