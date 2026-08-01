package likelion.khu.website.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Flyway 10에서 spring.flyway.clean-on-validation-error 프로퍼티 자체가 제거돼(설정만 해도
 * "has been removed" 예외를 던짐), stage 전용으로 검증 실패를 자동 복구하는 전략을 직접
 * 재구현한다. @Profile("stage")라 prod에는 이 빈 자체가 생성되지 않고, prod은 검증 실패 시
 * Spring Boot 기본 동작(기동 실패 → 헬스체크 실패 → CD 자동 롤백)을 그대로 따른다.
 *
 * (2026-08-01, #320 검증 중 실제 사고) 원래는 clean()(DB 전체 삭제) 후 migrate()였는데, 이미
 * 적용된 마이그레이션 파일을 지운 뒤 재배포하는 흔한 정리 작업만으로 stage의 실제 데이터가
 * 통째로 사라지는 사고가 실제로 발생했다 — 헬스체크는 빈 스키마 위에서도 정상 통과해 CD 로그엔
 * 아무 이상도 안 남았다. clean() 대신 repair()로 바꿔서, "장부(flyway_schema_history)엔 있는데
 * 파일이 없거나 체크섬이 다른" 불일치를 데이터를 지우지 않고 장부만 정정하는 방식으로 해소한다.
 * (1차 방어는 cd.yml의 "마이그레이션 위험도 판단" job — 이미 배포된 마이그레이션이 삭제·수정되면
 * 그 시점에 배포 자체를 막아서 이 catch 블록에 도달할 일을 원천적으로 줄인다. 이 안전장치는
 * 그래도 뚫고 들어오는 경우(예: 이 체크가 못 잡는 패턴, workflow_dispatch 등)를 위한 최후 방어선.)
 */
@Slf4j
@Configuration
public class FlywayConfig {

    @Bean
    @Profile("stage")
    public FlywayMigrationStrategy stageRepairOnValidationErrorStrategy() {
        return flyway -> {
            try {
                flyway.migrate();
            } catch (FlywayValidateException e) {
                log.warn("stage 마이그레이션 검증 실패 — repair로 장부만 정정 후 재적용합니다(데이터는 지우지 않음, stage 전용 정책)", e);
                flyway.repair();
                flyway.migrate();
            }
        };
    }
}
