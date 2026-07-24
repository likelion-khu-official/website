package likelion.khu.website.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * stage 전용 clean-on-validation-error 재구현 빈이 정확히 stage 프로파일에서만
 * 생성되는지 고정한다 — prod에 이 빈이 새어 들어가면 자동 clean 경로가 생기므로,
 * "prod은 절대 안 됨"을 코드 레벨에서 계속 보장하는 게 핵심이다.
 */
class FlywayConfigTest {

    private final ApplicationContextRunner contextRunner =
            new ApplicationContextRunner().withUserConfiguration(FlywayConfig.class);

    @Test
    void stageProfile_createsFlywayMigrationStrategyBean() {
        contextRunner.withPropertyValues("spring.profiles.active=stage")
                .run(context -> assertThat(context).hasSingleBean(FlywayMigrationStrategy.class));
    }

    @Test
    void prodProfile_doesNotCreateFlywayMigrationStrategyBean() {
        contextRunner.withPropertyValues("spring.profiles.active=prod")
                .run(context -> assertThat(context).doesNotHaveBean(FlywayMigrationStrategy.class));
    }

    @Test
    void noActiveProfile_doesNotCreateFlywayMigrationStrategyBean() {
        contextRunner.run(context -> assertThat(context).doesNotHaveBean(FlywayMigrationStrategy.class));
    }
}
