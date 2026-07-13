package likelion.khu.website.admin.seed;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.admin.password.AdminPasswordResetService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AdminSeedRunner implements ApplicationRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminPasswordResetService passwordResetService;

    // 포맷: "email:name,email2:name2" — 실제 이메일은 이 값을 담는 어떤 소스 파일에도 커밋하지 않고
    // 각 환경의 gitignore된 .env.stage/.env.prod에서만 주입한다(레포 pre-commit gitleaks 훅 대상).
    @Value("${admin.seed.super-admins:}")
    private String superAdminsRaw;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (superAdminsRaw == null || superAdminsRaw.isBlank()) {
            return;
        }
        for (String entry : superAdminsRaw.split(",")) {
            seedOne(entry.trim());
        }
    }

    private void seedOne(String entry) {
        if (entry.isEmpty()) {
            return;
        }
        String[] parts = entry.split(":", 2);
        if (parts.length != 2) {
            return;
        }
        String email = parts[0].trim();
        String name = parts[1].trim();
        // existsByEmail로 멱등 — 재시작·재배포마다 다시 만들거나 재발송하지 않는다.
        if (email.isEmpty() || name.isEmpty() || adminRepository.existsByEmail(email)) {
            return;
        }

        // 폐기용 무작위 비밀번호로 생성 — 아무도 이 값을 알지 못한 채, 곧바로 비밀번호 재설정 메일로
        // 실제 비밀번호를 직접 설정하게 한다(초대받은 ADMIN과 동일한 온보딩 경험, 초기 비번 전달 경로 자체를 없앰).
        String discardedPassword = UUID.randomUUID() + UUID.randomUUID().toString();
        Admin admin = adminRepository.save(
                Admin.register(email, name, passwordEncoder.encode(discardedPassword), AdminRole.SUPER_ADMIN));
        passwordResetService.issueAndSendResetToken(admin);
    }
}
