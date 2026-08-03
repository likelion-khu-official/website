package likelion.khu.website.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.web.servlet.error.DefaultErrorAttributes;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.WebRequest;

import java.util.Map;

// GlobalExceptionHandler의 30여 개 @ExceptionHandler 규칙 어디에도 안 걸린 나머지가
// 최종적으로 도착하는 곳(Spring Boot가 기본 제공하는 BasicErrorController가 이 클래스를
// 통해 에러 응답 내용을 채운다). GlobalExceptionHandler에 catch-all(Exception.class)을
// 직접 두면 AccessDeniedException(403)·NoResourceFoundException(404)처럼 이미 다른 곳
// (Spring Security 필터, Spring MVC 표준 예외 처리)에서 정확히 처리되던 것까지 먼저
// 가로채서 500으로 깨지는 회귀가 났다(#313 PR) — 그런 것들은 이 클래스까지 아예 안 오므로
// (각자의 경로에서 이미 응답이 끝나거나, 여기 오더라도 우리가 종류를 몰라도 status가 이미
// 올바르게 정해져 있으므로) 안전하다.
@Slf4j
@Component
public class LoggingErrorAttributes extends DefaultErrorAttributes {

    @Override
    public Map<String, Object> getErrorAttributes(WebRequest webRequest, ErrorAttributeOptions options) {
        Map<String, Object> defaults = super.getErrorAttributes(webRequest, options);
        int status = defaults.get("status") instanceof Integer s ? s : 500;

        if (status >= 500) {
            // 진짜 예상 못한 서버 에러(NPE·DB 에러 등)만 여기서 로그로 남긴다. 4xx(존재하지
            // 않는 경로 등 흔한 클라이언트 실수)는 볼륨 대비 가치가 낮아 로깅 안 함.
            log.error("예상하지 못한 서버 에러", getError(webRequest));
            return Map.of("success", false, "message", "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
        }
        return Map.of("success", false, "message", "요청을 처리할 수 없어요.");
    }
}
