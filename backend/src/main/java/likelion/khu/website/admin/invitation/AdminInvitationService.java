package likelion.khu.website.admin.invitation;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminPasswordPolicy;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.exception.AdminAlreadyMemberException;
import likelion.khu.website.admin.exception.AdminInvitationAlreadyProcessedException;
import likelion.khu.website.admin.exception.AdminInvitationExpiredException;
import likelion.khu.website.admin.exception.AdminInvitationIdNotFoundException;
import likelion.khu.website.admin.exception.AdminInvitationNotFoundException;
import likelion.khu.website.admin.exception.InvalidEmailDomainException;
import likelion.khu.website.admin.invitation.dto.AdminInvitationAcceptResponse;
import likelion.khu.website.admin.invitation.dto.AdminInvitationResponse;
import likelion.khu.website.admin.invitation.dto.AdminInvitationVerifyResponse;
import likelion.khu.website.audit.AuditOutcome;
import likelion.khu.website.audit.AuditService;
import likelion.khu.website.email.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminInvitationService {

    private static final Duration TTL = Duration.ofHours(72);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String ALLOWED_EMAIL_DOMAIN = "@khu.ac.kr";

    private final AdminInvitationRepository invitationRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    @Transactional
    public AdminInvitationResponse invite(String email, String invitedByEmail) {
        if (!email.toLowerCase(Locale.ROOT).endsWith(ALLOWED_EMAIL_DOMAIN)) {
            throw new InvalidEmailDomainException();
        }
        if (adminRepository.existsByEmail(email)) {
            throw new AdminAlreadyMemberException();
        }
        // 같은 이메일에 대기 중인 초대가 이미 있으면 취소하고 새로 발급 — 멱등 재발송(스펙 명시 아님, 해석).
        invitationRepository.findByEmailAndStatus(email, InvitationStatus.PENDING)
                .ifPresent(AdminInvitation::markCancelled);

        String token = generateToken();
        AdminInvitation invitation = invitationRepository.save(
                AdminInvitation.issue(email, invitedByEmail, hash(token), TTL));

        String inviteUrl = frontendBaseUrl + "/admin/invite/" + token;
        emailService.sendInviteEmail(email, inviteUrl, invitation.getExpiresAt());

        auditService.recordStateChange("관리자 초대: " + email, "ADMIN_INVITATION", invitation.getId(), AuditOutcome.SUCCESS);
        return AdminInvitationResponse.from(invitation);
    }

    @Transactional(readOnly = true)
    public List<AdminInvitationResponse> list() {
        return invitationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(AdminInvitationResponse::from)
                .toList();
    }

    @Transactional
    public void cancel(Long id) {
        AdminInvitation invitation = invitationRepository.findById(id)
                .orElseThrow(AdminInvitationIdNotFoundException::new);
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new AdminInvitationAlreadyProcessedException();
        }
        invitation.markCancelled();
        auditService.recordStateChange("관리자 초대 취소: " + invitation.getEmail(), "ADMIN_INVITATION", id, AuditOutcome.SUCCESS);
    }

    @Transactional(readOnly = true)
    public AdminInvitationVerifyResponse verify(String token) {
        AdminInvitation invitation = findPendingByToken(token);
        return new AdminInvitationVerifyResponse(invitation.getEmail());
    }

    @Transactional
    public AdminInvitationAcceptResponse accept(String token, String name, String password) {
        AdminInvitation invitation = findPendingByToken(token);
        AdminPasswordPolicy.validate(password);

        Admin admin = adminRepository.save(
                Admin.register(invitation.getEmail(), name, passwordEncoder.encode(password)));
        invitation.markAccepted();

        return AdminInvitationAcceptResponse.from(admin);
    }

    private AdminInvitation findPendingByToken(String token) {
        AdminInvitation invitation = invitationRepository.findByTokenHash(hash(token))
                .orElseThrow(AdminInvitationNotFoundException::new);
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new AdminInvitationAlreadyProcessedException();
        }
        if (invitation.isExpired()) {
            throw new AdminInvitationExpiredException();
        }
        return invitation;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
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
