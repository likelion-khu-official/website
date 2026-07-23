package likelion.khu.website.admin.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminPrincipal {
    private final Long id;
    private final String email;
    private final String role;
    // 어드민 로그인엔 없는 개념이라 항상 false. 멤버(MEMBER) 로그인에서만 의미 있음 — MemberPasswordGuardFilter가 읽는다.
    private final boolean mustChangePassword;
}
