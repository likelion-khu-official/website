package likelion.khu.website.admin;

import likelion.khu.website.admin.auth.AdminPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

import java.util.List;

public class WithMockAdminUserSecurityContextFactory implements WithSecurityContextFactory<WithMockAdminUser> {

    @Override
    public SecurityContext createSecurityContext(WithMockAdminUser annotation) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        AdminPrincipal principal = new AdminPrincipal(annotation.id(), annotation.email(), annotation.role(), annotation.mustChangePassword());
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + annotation.role()));
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, authorities));
        return context;
    }
}
