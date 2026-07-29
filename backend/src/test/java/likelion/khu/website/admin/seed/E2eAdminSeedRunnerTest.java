package likelion.khu.website.admin.seed;

import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("e2e")
@Transactional
class E2eAdminSeedRunnerTest {

    @Autowired E2eAdminSeedRunner seedRunner;
    @Autowired AdminRepository adminRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @Test
    void run_SeedsFixedPasswordSuperAdminAndAdmin() {
        seedRunner.run(emptyArgs());

        var superAdmin = adminRepository.findByEmail("e2e-super-admin@likelion-khu.com").orElseThrow();
        assertThat(superAdmin.getRole()).isEqualTo(AdminRole.SUPER_ADMIN);
        assertThat(passwordEncoder.matches("E2eSuperAdmin!2026", superAdmin.getPasswordHash())).isTrue();

        var admin = adminRepository.findByEmail("e2e-admin@likelion-khu.com").orElseThrow();
        assertThat(admin.getRole()).isEqualTo(AdminRole.ADMIN);
        assertThat(passwordEncoder.matches("E2eAdmin!2026", admin.getPasswordHash())).isTrue();
    }

    @Test
    void run_CalledTwice_DoesNotDuplicate() {
        seedRunner.run(emptyArgs());
        seedRunner.run(emptyArgs());

        assertThat(adminRepository.findAll()).hasSize(2);
    }

    private ApplicationArguments emptyArgs() {
        return new DefaultApplicationArguments();
    }
}
