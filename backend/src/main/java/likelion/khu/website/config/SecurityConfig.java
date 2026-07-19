package likelion.khu.website.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import likelion.khu.website.admin.auth.JwtAuthenticationFilter;
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
                // 매직링크 토큰 — 운영진 인증 붙기 전까지 임시 공개
                // TODO: 운영진 인증 도입되면 발급(POST)은 운영진 전용으로 좁히기
                .requestMatchers("/api/feed/tokens/**").permitAll()
                // 피드 이미지 업로드 — 매직링크 글쓰기 흐름 자체가 비인증이라 임시 공개
                // TODO: 남용 방지용 인증/레이트리밋 필요해지면 여기에 추가
                .requestMatchers("/api/feed/images/**").permitAll()
                // 멤버 공개 목록
                .requestMatchers("/api/members").permitAll()
                // 운영진 소개 공개 목록
                .requestMatchers("/api/staff").permitAll()
                // 피드 글 — 공개 읽기 + 매직링크 제출
                .requestMatchers("/api/posts/**").permitAll()
                // 피드 댓글 — 공개 읽기·작성 + 어드민 숨기기
                .requestMatchers("/api/posts/*/comments/**").permitAll()
                // 어드민 로그인/로그아웃/리프레시 — SecurityContext가 아니라 refresh_token 쿠키 자체 내용으로
                // 동작(만료된 access 토큰으로도 로그아웃·리프레시가 가능해야 함)이라 matcher 자체는 permitAll()
                .requestMatchers("/api/admin/auth/**").permitAll()
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
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

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
