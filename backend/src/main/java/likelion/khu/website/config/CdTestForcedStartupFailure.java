package likelion.khu.website.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * #320 CD 검증 전용 — 절대 dev/main에 merge하지 않는다.
 * 마이그레이션과 무관한 이유로 앱 기동이 실패하는 상황(예: JavaMailSender 빈 누락 사고)을
 * 재현하기 위해, Spring 컨텍스트 초기화 중 항상 예외를 던지는 빈을 강제로 추가한다.
 */
@Configuration
public class CdTestForcedStartupFailure {

    @Bean
    public Object cdTestForcedStartupFailureBean() {
        throw new IllegalStateException("#320 CD 검증용 강제 기동 실패 — 정상 동작임, 실제 버그 아님");
    }
}
