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

// 첫 로그인(또는 관리자 초기화 직후) 비밀번호를 안 바꾼 멤버는 비번 변경 전까지 "멤버 전용" API를
// 못 쓰게 막는다(Done: "첫 로그인 때 비밀번호를 꼭 바꾸게 돼요"). 이 필터는 SecurityFilterChain에
// 무조건 등록돼 permitAll() 여부와 무관하게 모든 요청에서 실행되므로, 막는 범위를 "/api/member/"
// 네임스페이스로 한정해야 한다 — 처음엔 전역으로 막았는데, 그러면 /api/posts·/api/members 같은
// 완전 공개 API까지 403이 나서 막 가입한 멤버가 첫 로그인 직후 사이트 자체를 못 보는 문제가 있었다.
// /api/member/auth/**(로그인·로그아웃·리프레시·비번변경, 인증 모듈 자기 자신)는 통째로 열어둔다 —
// 개별 경로를 나열하면(구버전처럼) 하나라도 빠뜨렸을 때 "재로그인 자체가 막히는" 사고가 난다.
@Component
@RequiredArgsConstructor
public class MemberPasswordGuardFilter extends OncePerRequestFilter {

    private static final String MEMBER_NAMESPACE = "/api/member/";
    private static final String MEMBER_AUTH_PREFIX = "/api/member/auth/";

    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof AdminPrincipal principal
                && principal.isMustChangePassword()
                && requiresPasswordChange(request.getRequestURI())) {
            writeBlockedResponse(response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean requiresPasswordChange(String uri) {
        return uri.startsWith(MEMBER_NAMESPACE) && !uri.startsWith(MEMBER_AUTH_PREFIX);
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
