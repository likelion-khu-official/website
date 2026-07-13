package likelion.khu.website.admin.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminPrincipal {
    private final Long id;
    private final String email;
    private final String role;
}
