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

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString();
        MDC.put(MDC_KEY, requestId);
        response.setHeader(HEADER_NAME, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            // 스레드 풀 재사용 시 다음 요청에 이전 requestId가 새어나가지 않게 반드시 정리한다.
            MDC.remove(MDC_KEY);
        }
    }
}
