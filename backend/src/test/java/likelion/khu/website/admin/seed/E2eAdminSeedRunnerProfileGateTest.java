package likelion.khu.website.admin.seed;

import likelion.khu.website.admin.AdminRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * 고정 비밀번호 계정은 e2e 프로필에서만 만들어져야 한다 — stage/prod에 이 빈이 새어 들어가면
 * 알려진 비밀번호의 관리자 계정이 운영 DB에 생긴다. FlywayConfigTest와 같은 취지로,
 * 프로필 게이팅 자체를 코드 레벨에서 계속 보장한다.
 */
class E2eAdminSeedRunnerProfileGateTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(AdminRepository.class, () -> mock(AdminRepository.class))
            .withBean(PasswordEncoder.class, () -> mock(PasswordEncoder.class))
            .withUserConfiguration(E2eAdminSeedRunner.class);

    @Test
    void e2eProfile_createsE2eAdminSeedRunnerBean() {
        contextRunner.withPropertyValues("spring.profiles.active=e2e")
                .run(context -> assertThat(context).hasSingleBean(E2eAdminSeedRunner.class));
    }

    @Test
    void stageProfile_doesNotCreateE2eAdminSeedRunnerBean() {
        contextRunner.withPropertyValues("spring.profiles.active=stage")
                .run(context -> assertThat(context).doesNotHaveBean(E2eAdminSeedRunner.class));
    }

    @Test
    void prodProfile_doesNotCreateE2eAdminSeedRunnerBean() {
        contextRunner.withPropertyValues("spring.profiles.active=prod")
                .run(context -> assertThat(context).doesNotHaveBean(E2eAdminSeedRunner.class));
    }

    @Test
    void noActiveProfile_doesNotCreateE2eAdminSeedRunnerBean() {
        contextRunner.run(context -> assertThat(context).doesNotHaveBean(E2eAdminSeedRunner.class));
    }
}
