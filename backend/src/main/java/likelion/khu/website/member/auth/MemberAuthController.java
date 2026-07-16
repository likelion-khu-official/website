package likelion.khu.website.member.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminCookieFactory;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.member.auth.dto.MemberChangePasswordRequest;
import likelion.khu.website.member.auth.dto.MemberLoginRequest;
import likelion.khu.website.member.auth.dto.MemberSessionResponse;
import likelion.khu.website.member.auth.dto.MemberSuccessResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.WebUtils;

// admin.auth.AdminAuthController와 같은 패턴(로그인=쿠키 발급, 로그아웃/리프레시=refresh_token 쿠키 자체로 동작).
@RestController
@RequestMapping("/api/member/auth")
@RequiredArgsConstructor
public class MemberAuthController {

    private final MemberAuthService authService;
    private final MemberCookieFactory cookieFactory;

    @PostMapping("/login")
    public ResponseEntity<MemberSessionResponse> login(@Valid @RequestBody MemberLoginRequest request) {
        MemberAuthService.LoginResult result = authService.login(request.getStudentId(), request.getPassword());
        return withTokenCookies(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<MemberSuccessResponse> logout(HttpServletRequest request) {
        authService.logout(refreshTokenOf(request));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.clearedAccessTokenCookie().toString())
                .header(HttpHeaders.SET_COOKIE, cookieFactory.clearedRefreshTokenCookie().toString())
                .body(new MemberSuccessResponse());
    }

    @PostMapping("/refresh")
    public ResponseEntity<MemberSessionResponse> refresh(HttpServletRequest request) {
        MemberAuthService.LoginResult result = authService.refresh(refreshTokenOf(request));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.accessTokenCookie(result.getAccessToken()).toString())
                .body(result.getSession());
    }

    // 첫 로그인 강제 변경도 이 엔드포인트를 쓴다 — MemberPasswordGuardFilter가 mustChangePassword=true인
    // 동안에도 이 경로만은 허용한다. hasRole('MEMBER')로 못박은 이유 — principal.getId()를 memberId로 바로
    // 쓰기 때문에, 어드민 principal이 여길 타면 우연히 같은 숫자 id를 가진 남의 멤버 계정을 건드릴 수 있다.
    @PreAuthorize("hasRole('MEMBER')")
    @PatchMapping("/password")
    public ResponseEntity<MemberSessionResponse> changePassword(
            @Valid @RequestBody MemberChangePasswordRequest request,
            Authentication authentication) {
        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        MemberAuthService.LoginResult result = authService.changePassword(
                principal.getId(), request.getCurrentPassword(), request.getNewPassword());
        return withTokenCookies(result);
    }

    private ResponseEntity<MemberSessionResponse> withTokenCookies(MemberAuthService.LoginResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.accessTokenCookie(result.getAccessToken()).toString())
                .header(HttpHeaders.SET_COOKIE, cookieFactory.refreshTokenCookie(result.getRefreshToken()).toString())
                .body(result.getSession());
    }

    private String refreshTokenOf(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, AdminCookieFactory.REFRESH_TOKEN_COOKIE);
        return cookie == null ? null : cookie.getValue();
    }
}
