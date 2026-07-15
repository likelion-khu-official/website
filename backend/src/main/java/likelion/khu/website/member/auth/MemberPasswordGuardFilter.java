package likelion.khu.website.member.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import likelion.khu.website.admin.auth.AdminPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

// 첫 로그인(또는 관리자 초기화 직후) 비밀번호를 안 바꾼 멤버는 비번 변경 전까지 다른 API를 못 쓰게 막는다
// (Done: "첫 로그인 때 비밀번호를 꼭 바꾸게 돼요"). JwtAuthenticationFilter 뒤에서 SecurityContext를
// 읽기만 하므로, 로그인 전 permitAll 경로는 인증 자체가 없어 전혀 영향받지 않는다.
@Component
@RequiredArgsConstructor
public class MemberPasswordGuardFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_PATHS = Set.of(
            "/api/member/auth/password",
            "/api/member/auth/logout",
            "/api/member/auth/refresh"
    );

    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof AdminPrincipal principal
                && principal.isMustChangePassword()
                && !ALLOWED_PATHS.contains(request.getRequestURI())) {
            writeBlockedResponse(response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private void writeBlockedResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                "success", false,
                "message", "첫 로그인 비밀번호를 먼저 바꿔주세요.",
                "code", "MUST_CHANGE_PASSWORD"
        )));
    }
}
