package likelion.khu.website.common;

import org.slf4j.MDC;
import org.springframework.core.task.TaskDecorator;
import org.springframework.stereotype.Component;

import java.util.Map;

// MDC(RequestIdFilter가 심어둔 requestId 등)는 스레드 하나에 묶여있어서, @Async가 작업을
// 다른 스레드로 넘기는 순간 자동으로는 안 따라간다(예: RecruitmentOpenEmailEventListener,
// EmailLogEventListener). Spring Boot가 @EnableAsync 감지 시 자동으로 만드는
// ThreadPoolTaskExecutor는 TaskDecorator 타입 빈이 있으면 자동으로 찾아서 적용해준다 —
// 그래서 이 빈 하나만 있으면 앱의 모든 @Async 메서드에 별도 설정 없이 다 적용된다.
//
// 요청 스레드가 @Async 작업을 넘기는 "그 순간"의 MDC를 복사해두고(예: 모집 열기 요청의
// requestId), 실제로 다른 스레드에서 실행될 때 그 값을 그대로 심어준다 — 그래서 "구독자
// 100명에게 순차로 보내는 로그" 전부가 원래 모집 열기 요청과 같은 requestId를 달게 된다.
@Component
public class MdcTaskDecorator implements TaskDecorator {

    @Override
    public Runnable decorate(Runnable runnable) {
        Map<String, String> contextMap = MDC.getCopyOfContextMap();
        return () -> {
            Map<String, String> previous = MDC.getCopyOfContextMap();
            try {
                if (contextMap != null) {
                    MDC.setContextMap(contextMap);
                }
                runnable.run();
            } finally {
                // 스레드 풀 재사용 대비 — 이 작업 전에 그 스레드에 남아있던 컨텍스트로 복원
                // (RequestIdFilter가 늘 remove()로 비워두므로 보통 null이지만, 방어적으로).
                if (previous != null) {
                    MDC.setContextMap(previous);
                } else {
                    MDC.clear();
                }
            }
        };
    }
}
