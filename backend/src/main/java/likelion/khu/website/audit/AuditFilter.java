package likelion.khu.website.audit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.admin.auth.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

// 서버 경계에서 상태변경과 민감 열람을 무조건 남긴다 — 요청이 어디서 왔든(FE 경고를 우회했든, API를
// 직접 호출했든) 이 필터를 지나므로 로그가 빠지지 않는다(#338). 인증(로그인/로그아웃)은 성공·실패와
// 시도 대상을 정확히 알아야 해서 여기가 아니라 각 AuthService에서 직접 남긴다.
@Component
@RequiredArgsConstructor
public class AuditFilter extends OncePerRequestFilter {

    // 조회지만 남겨야 하는 민감 열람 경로 — 지원자 개인정보 명단, 그리고 감사 로그 자체를 열어 본 것.
    // (열람당 한 건만 남게 FE가 조회를 한 번만 보낸다.)
    private static final Set<String> SENSITIVE_READ_PATHS = Set.of(
            "/api/admin/applications",
            "/api/admin/audit-logs");

    private final AuditService auditService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } finally {
            AuditAction action = auditableAction(request);
            if (action != null) {
                recordSafely(request, response, action);
            }
        }
    }

    // 상태변경은 각 서비스가 사람이 읽는 요약과 함께 명시적으로 남긴다(#339 피드백 — "누구에게/무엇을"이
    // 경로만으로는 안 드러나서). 이 필터는 흔적이 남지 않는 민감 '열람'만 서버 경계에서 보장한다.
    private AuditAction auditableAction(HttpServletRequest request) {
        if ("GET".equals(request.getMethod()) && SENSITIVE_READ_PATHS.contains(request.getRequestURI())) {
            return AuditAction.SENSITIVE_READ;
        }
        return null;
    }

    // 기록이 실패해도 사용자 요청은 이미 끝났으므로 응답에 영향을 주지 않는다.
    private void recordSafely(HttpServletRequest request, HttpServletResponse response, AuditAction action) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            ActorType actorType = ActorType.ANONYMOUS;
            Long actorId = null;
            String actorLabel = null;
            if (authentication != null && authentication.getPrincipal() instanceof AdminPrincipal principal) {
                actorType = JwtProvider.MEMBER_ROLE.equals(principal.getRole()) ? ActorType.MEMBER : ActorType.ADMIN;
                actorId = principal.getId();
                actorLabel = principal.getEmail();
            }
            AuditOutcome outcome = response.getStatus() >= 400 ? AuditOutcome.FAILURE : AuditOutcome.SUCCESS;
            auditService.record(actorType, actorId, actorLabel, action,
                    request.getMethod(), request.getRequestURI(), outcome, response.getStatus(), clientIp(request));
        } catch (RuntimeException ignored) {
            // 감사 기록 실패가 사용자 흐름을 깨서는 안 된다.
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
