package likelion.khu.website.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

// 요청 하나가 서비스 로그·에러 로그 등 여러 줄에 걸칠 때, 그 줄들을 하나로 묶어볼 수 있게
// 요청마다 ID를 발급해 로그 패턴에 심는다(application.yml의 logging.pattern.level 참고).
// 클라이언트가 보낸 값은 신뢰하지 않고 항상 서버에서 새로 발급 — 응답 헤더로 돌려줘서
// 필요하면 FE·QA가 "이 요청, 서버 로그에서 어떤 requestId였는지"를 알 수 있게 한다.
//
// @Order(HIGHEST_PRECEDENCE): Spring Security 필터 체인보다도 먼저 실행돼야, 그 안의
// 필터(JwtAuthenticationFilter 등)가 남기는 로그에도 이 ID가 붙는다.
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    private static final String MDC_KEY = "requestId";
    private static final String HEADER_NAME = "X-Request-Id";
    private static final String REQUEST_ATTRIBUTE = RequestIdFilter.class.getName() + ".requestId";

    // OncePerRequestFilter 기본값(true)은 예외로 인한 Tomcat의 내부 /error 재전송
    // (DispatcherType.ERROR)에서 이 필터 자체를 건너뛴다. 그런데 그 재전송이야말로
    // LoggingErrorAttributes가 "예상 못한 서버 에러"를 로그로 남기는 바로 그 지점이라,
    // 건너뛰면 정작 가장 필요한 로그에 requestId가 안 붙는다(#404 리뷰, Copilot 발견).
    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // /error 재전송은 이 필터를 다시 거치므로(위 shouldNotFilterErrorDispatch), 매번 새로
        // 발급하면 원래 요청과 다른 ID가 된다. request attribute는 forward에도 그대로 살아있는
        // (MDC와 달리 스레드 로컬이 아닌) 값이라, 여기 이미 있으면 재사용해 같은 ID를 유지한다.
        String requestId = (String) request.getAttribute(REQUEST_ATTRIBUTE);
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
            request.setAttribute(REQUEST_ATTRIBUTE, requestId);
        }
        MDC.put(MDC_KEY, requestId);
        response.setHeader(HEADER_NAME, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            // 스레드 풀 재사용 시 다음 요청(또는 이 요청의 원래 dispatch로 되돌아갈 때)에
            // 남아있으면 안 되니 매 pass 종료마다 정리한다.
            MDC.remove(MDC_KEY);
        }
    }
}
