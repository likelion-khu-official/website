package likelion.khu.website.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import likelion.khu.website.admin.auth.JwtAuthenticationFilter;
import likelion.khu.website.member.auth.MemberPasswordGuardFilter;
import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                            JwtAuthenticationFilter jwtAuthenticationFilter,
                                            MemberPasswordGuardFilter memberPasswordGuardFilter,
                                            ObjectMapper objectMapper) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // CD 헬스체크 — SecurityFilterChain 정의 시 자동 허용이 꺼지므로 명시 필수
                .requestMatchers(EndpointRequest.to(HealthEndpoint.class)).permitAll()
                // Swagger UI (개발 편의)
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()
                // 모집 알림 구독 — 비인증 공개
                .requestMatchers("/api/notifications/subscribe").permitAll()
                // 모집 상태(공개용, subscriberCount 없음) — 랜딩/‌recruit 페이지가 평소·모집중을 가르는 데 씀(#151)
                .requestMatchers("/api/recruitment/status").permitAll()
                // 멤버 공개 목록
                .requestMatchers("/api/members").permitAll()

                // 운영진 소개 공개 목록
                .requestMatchers("/api/staff").permitAll()

                // 피드 글 — GET(목록·상세)은 공개, POST(글 작성)는 로그인 멤버 전용(#115)
                .requestMatchers(HttpMethod.GET, "/api/posts", "/api/posts/*").permitAll()
                // 프로젝트 쇼케이스 — 목록·상세는 공개, 생성/수정/삭제는 hasRole('MEMBER')로 컨트롤러에서 처리(#119)
                .requestMatchers(HttpMethod.GET, "/api/projects", "/api/projects/*").permitAll()
                // 피드 댓글 — 공개 읽기·작성 + 어드민 숨기기
                .requestMatchers("/api/posts/*/comments/**").permitAll()
                // 어드민 로그인/로그아웃/리프레시 — SecurityContext가 아니라 refresh_token 쿠키 자체 내용으로
                // 동작(만료된 access 토큰으로도 로그아웃·리프레시가 가능해야 함)이라 matcher 자체는 permitAll()
                .requestMatchers("/api/admin/auth/**").permitAll()
                // 멤버 로그인/로그아웃/리프레시 — 위 어드민 auth와 같은 이유로 permitAll(). 단 비번 변경
                // (/api/member/auth/password)은 본인 인증이 필요해 여기 포함하지 않는다(#117).
                .requestMatchers(HttpMethod.POST, "/api/member/auth/login", "/api/member/auth/logout",
                        "/api/member/auth/refresh").permitAll()
                // 초대 수락 흐름 — 가입 전(계정 자체가 없음), 토큰이 자격증명 역할
                .requestMatchers(HttpMethod.GET, "/api/admin/invitations/*/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/admin/invitations/*/accept").permitAll()
                // 비밀번호 재설정 흐름 — 로그인 전이라 인증 자체가 불가능
                .requestMatchers(HttpMethod.POST, "/api/admin/password/forgot").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/admin/password/reset/*/verify").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/admin/password/reset/*").permitAll()
                // 어드민 피드 API — #90(운영진 인증)이 닫는 지점. 기존엔 인증이 아예 없어 permitAll이었음
                .requestMatchers("/api/admin/posts/**", "/api/admin/comments/**").authenticated()
                // @Valid 실패 시 Tomcat이 /error로 포워드 — 여기도 열어야 403 안 남
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            )
            // @PreAuthorize가 던지는 AccessDeniedException과 미인증 AuthenticationException은
            // ExceptionTranslationFilter(시큐리티 필터 레벨)에서 가로채지 @RestControllerAdvice까지 오지
            // 않는다 — 그래서 GlobalExceptionHandler가 아니라 여기서 직접 JSON을 작성한다.
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, authException) ->
                    writeJsonError(response, objectMapper, 401, "UNAUTHENTICATED", "로그인이 필요해요."))
                .accessDeniedHandler((request, response, accessDeniedException) ->
                    writeJsonError(response, objectMapper, 403, "FORBIDDEN", "권한이 없어요."))
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(memberPasswordGuardFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    private void writeJsonError(HttpServletResponse response, ObjectMapper objectMapper,
                                 int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(
                Map.of("success", false, "message", message, "code", code)));
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
