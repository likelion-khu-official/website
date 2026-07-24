package likelion.khu.website.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Flyway 10에서 spring.flyway.clean-on-validation-error 프로퍼티 자체가 제거돼(설정만 해도
 * "has been removed" 예외를 던짐), stage 전용으로 같은 동작(체크섬 불일치 시 clean 후 재적용)을
 * 직접 재구현한다. @Profile("stage")라 prod에는 이 빈 자체가 생성되지 않고, prod은 검증 실패 시
 * Spring Boot 기본 동작(기동 실패 → 헬스체크 실패 → CD 자동 롤백)을 그대로 따른다 — 데이터를
 * 자동으로 지우는 경로가 prod 코드 경로에는 아예 존재하지 않는다.
 */
@Slf4j
@Configuration
public class FlywayConfig {

    @Bean
    @Profile("stage")
    public FlywayMigrationStrategy stageCleanOnValidationErrorStrategy() {
        return flyway -> {
            try {
                flyway.migrate();
            } catch (FlywayValidateException e) {
                log.warn("stage 마이그레이션 체크섬 불일치 — clean 후 재적용합니다(stage 전용 정책)", e);
                flyway.clean();
                flyway.migrate();
            }
        };
    }
}
