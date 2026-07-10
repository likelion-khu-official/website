package likelion.khu.website.admin.seed;

import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.email.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AdminSeedRunnerTest {

    @Autowired AdminSeedRunner seedRunner;
    @Autowired AdminRepository adminRepository;

    @MockitoBean
    EmailService emailService;

    @Test
    void run_SeedsConfiguredSuperAdminsOnce() {
        ReflectionTestUtils.setField(seedRunner, "superAdminsRaw", "seed-a@khu.ac.kr:이름A,seed-b@khu.ac.kr:이름B");

        seedRunner.run(emptyArgs());

        assertThat(adminRepository.existsByEmail("seed-a@khu.ac.kr")).isTrue();
        assertThat(adminRepository.existsByEmail("seed-b@khu.ac.kr")).isTrue();
        assertThat(adminRepository.findByEmail("seed-a@khu.ac.kr").orElseThrow().getRole())
                .isEqualTo(AdminRole.SUPER_ADMIN);
        verify(emailService, times(2)).sendPasswordResetEmail(any(), any(), any());
    }

    @Test
    void run_CalledTwice_DoesNotDuplicateOrResend() {
        ReflectionTestUtils.setField(seedRunner, "superAdminsRaw", "seed-c@khu.ac.kr:이름C");

        seedRunner.run(emptyArgs());
        seedRunner.run(emptyArgs());

        assertThat(adminRepository.findAll()).hasSize(1);
        verify(emailService, times(1)).sendPasswordResetEmail(any(), any(), any());
    }

    private ApplicationArguments emptyArgs() {
        return new DefaultApplicationArguments();
    }
}
