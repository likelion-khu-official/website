package likelion.khu.website.config;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.CoreErrorCode;
import org.flywaydb.core.api.ErrorDetails;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * stage 전용 검증 실패 복구 빈이 정확히 stage 프로파일에서만 생성되는지 고정한다 —
 * prod에 이 빈이 새어 들어가면 자동 복구 경로가 생기므로, "prod은 절대 안 됨"을
 * 코드 레벨에서 계속 보장하는 게 핵심이다.
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

    /**
     * 2026-08-01 사고 재발 방지 고정: 검증 실패 시 clean()(전체 데이터 삭제)이 아니라
     * repair()(장부만 정정)로 복구해야 한다. 이 테스트가 clean()이 다시 들어오는 걸 막는다.
     */
    @Test
    void onValidateFailure_repairsInsteadOfCleaning() {
        Flyway flyway = mock(Flyway.class);
        FlywayValidateException validateFailure = new FlywayValidateException(
                new ErrorDetails(CoreErrorCode.VALIDATE_ERROR, "applied migration not resolved locally"),
                "validate failed");
        // migrate()는 void가 아니라 MigrateResult를 반환하므로 doNothing()은 못 쓴다 — 첫 호출만
        // 검증 실패로 던지고, repair() 이후 재시도하는 두 번째 호출은 null을 반환하며 성공시킨다.
        doThrow(validateFailure).doReturn(null).when(flyway).migrate();

        FlywayMigrationStrategy strategy = new FlywayConfig().stageRepairOnValidationErrorStrategy();
        strategy.migrate(flyway);

        verify(flyway, times(1)).repair();
        verify(flyway, times(2)).migrate();
        verify(flyway, never()).clean();
    }
}
