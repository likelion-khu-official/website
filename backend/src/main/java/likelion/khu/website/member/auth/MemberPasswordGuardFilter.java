package likelion.khu.website.member.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import likelion.khu.website.admin.auth.AdminPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

// 첫 로그인(또는 관리자 초기화 직후) 비밀번호를 안 바꾼 멤버는 비번 변경 전까지 "쓰기" 행동을
// 못 하게 막는다(Done: "첫 로그인 때 비밀번호를 꼭 바꾸게 돼요"). 처음엔 "/api/member/" 경로만
// 막았는데(#117 최초 버전), 그 네임스페이스 밖에 새 멤버 전용 쓰기 API가 생길 때마다 똑같은 구멍이
// 반복된다는 게 #119(프로젝트 쇼케이스, /api/projects — /api/member/ 밖이라 가드가 전혀 안 걸렸다)
// 리뷰에서 실제로 드러났다. 리드미 기능 트리(멤버 영역 — 글쓰기·내프로필편집·내프로젝트 등)에도
// 앞으로 비슷한 멤버 전용 쓰기 API가 더 생길 걸 알 수 있어서, 경로를 나열하는 대신 "쓰기
// 메서드(POST/PUT/PATCH/DELETE)인가"로 판단을 일반화했다 — 읽기(GET)는 애초에 막을 이유가
// 없었고, 새로 생기는 멤버 전용 쓰기 API는 경로가 뭐든 자동으로 이 규칙에 걸린다.
// /api/member/auth/**(인증 모듈 자기 자신)만 예외 — 안 그러면 비번을 바꾸러 가는 요청 자체가 막힌다.
@Component
@RequiredArgsConstructor
public class MemberPasswordGuardFilter extends OncePerRequestFilter {

    private static final String MEMBER_AUTH_PREFIX = "/api/member/auth/";
    private static final Set<String> MUTATING_METHODS = Set.of(
            HttpMethod.POST.name(), HttpMethod.PUT.name(), HttpMethod.PATCH.name(), HttpMethod.DELETE.name());

    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof AdminPrincipal principal
                && principal.isMustChangePassword()
                && requiresPasswordChange(request)) {
            writeBlockedResponse(response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean requiresPasswordChange(HttpServletRequest request) {
        return MUTATING_METHODS.contains(request.getMethod())
                && !request.getRequestURI().startsWith(MEMBER_AUTH_PREFIX);
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
