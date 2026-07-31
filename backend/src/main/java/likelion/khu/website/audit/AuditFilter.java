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

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    // 조회지만 남겨야 하는 민감 열람 경로 — 지원자 개인정보 명단, 그리고 감사 로그 자체를 열어 본 것.
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

    // 무엇을 남길지 결정한다. 관리자·멤버 네임스페이스의 쓰기 요청은 상태변경으로, 민감 열람 경로의 GET은
    // SENSITIVE_READ로 남긴다. 로그인/로그아웃 경로는 AuthService가 따로 남기므로 여기선 제외해 중복을 막는다.
    private AuditAction auditableAction(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        if (path.startsWith("/api/admin/auth/") || path.startsWith("/api/member/auth/")) {
            return null;
        }
        if ("GET".equals(method) && SENSITIVE_READ_PATHS.contains(path)) {
            return AuditAction.SENSITIVE_READ;
        }
        boolean managedNamespace = path.startsWith("/api/admin/") || path.startsWith("/api/member/");
        if (managedNamespace && MUTATING_METHODS.contains(method)) {
            return AuditAction.STATE_CHANGE;
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
