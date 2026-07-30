package likelion.khu.website.admin.seed;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Playwright e2e는 storageState를 만들 때 실제 로그인이 필요하다 — 세션 쿠키가 HttpOnly라
 * JS로 직접 주입할 수 없다. {@link AdminSeedRunner}는 비밀번호를 알 수 없는 랜덤값으로 만들고
 * 재설정 메일로만 실제 비밀번호를 정하게 하는데(운영 계정 초기 비번 전달 경로 자체를 없애는 설계),
 * 그 설계를 유지한 채로는 e2e가 로그인할 방법이 없다. 그래서 이 러너는 고정 비밀번호를 그대로
 * 저장한다 — {@code @Profile("e2e")}로 SPRING_PROFILES_ACTIVE=e2e를 명시하지 않는 한(로컬/CI
 * 전용, .env.stage·.env.prod엔 없음) 이 빈 자체가 생성되지 않으므로 stage/prod엔 영향이 없다.
 * 단일 관리자 모델이라 계정은 하나만 시드한다.
 */
@Component
@Profile("e2e")
@RequiredArgsConstructor
public class E2eAdminSeedRunner implements ApplicationRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.e2e-seed.admin-email:e2e-admin@likelion-khu.com}")
    private String adminEmail;

    @Value("${admin.e2e-seed.admin-password:E2eAdmin!2026}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedOne(adminEmail, "E2E Admin", adminPassword);
    }

    private void seedOne(String email, String name, String rawPassword) {
        if (adminRepository.existsByEmail(email)) {
            return;
        }
        adminRepository.save(Admin.register(email, name, passwordEncoder.encode(rawPassword)));
    }
}
