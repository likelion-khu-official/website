package likelion.khu.website.admin;

import org.springframework.security.test.context.support.WithSecurityContext;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// @WithMockUser의 기본 principal은 org.springframework.security.core.userdetails.User라
// @AuthenticationPrincipal AdminPrincipal을 쓰는 컨트롤러에서 타입이 안 맞아 null이 된다.
// 그래서 JwtAuthenticationFilter가 실제로 채우는 것과 동일한 타입(AdminPrincipal)의
// SecurityContext를 만들어주는 전용 테스트 애노테이션.
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@WithSecurityContext(factory = WithMockAdminUserSecurityContextFactory.class)
public @interface WithMockAdminUser {
    long id() default 1L;

    String email() default "admin@khu.ac.kr";

    String role() default "SUPER_ADMIN";
}
