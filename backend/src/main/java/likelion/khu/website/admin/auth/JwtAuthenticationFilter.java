package likelion.khu.website.admin.auth;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

// access_token 쿠키만 읽는 순수 통과형 필터 — 쿠키가 없거나 무효해도 예외를 던지지 않고 그냥
// 익명으로 필터체인을 계속 진행한다. 이 덕분에 /actuator/health, /swagger-ui/** 등 기존
// permitAll() 경로가 이 필터 추가로 전혀 영향받지 않는다.
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        extractAccessToken(request)
                .flatMap(jwtProvider::parseClaims)
                .filter(jwtProvider::isAccessToken)
                .ifPresent(this::authenticate);
        filterChain.doFilter(request, response);
    }

    private void authenticate(Claims claims) {
        AdminPrincipal principal = new AdminPrincipal(
                Long.valueOf(claims.getSubject()),
                claims.get("email", String.class),
                claims.get("role", String.class));
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole()));
        var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private Optional<String> extractAccessToken(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, AdminCookieFactory.ACCESS_TOKEN_COOKIE);
        return cookie == null ? Optional.empty() : Optional.ofNullable(cookie.getValue());
    }
}
