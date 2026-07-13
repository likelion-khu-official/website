package likelion.khu.website.admin.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.dto.AdminLoginRequest;
import likelion.khu.website.admin.dto.AdminSessionResponse;
import likelion.khu.website.admin.dto.AdminSuccessResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.WebUtils;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService authService;
    private final AdminCookieFactory cookieFactory;

    @PostMapping("/login")
    public ResponseEntity<AdminSessionResponse> login(@Valid @RequestBody AdminLoginRequest request) {
        AdminAuthService.LoginResult result = authService.login(request.getEmail(), request.getPassword());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.accessTokenCookie(result.getAccessToken()).toString())
                .header(HttpHeaders.SET_COOKIE, cookieFactory.refreshTokenCookie(result.getRefreshToken()).toString())
                .body(result.getSession());
    }

    // refresh_token 쿠키 자체로 동작 — access 토큰이 만료된 상태에서도 로그아웃(탈취된 refresh 토큰 폐기)이
    // 가능해야 해서 matcher 레벨에서 permitAll(), SecurityContext 인증 여부와 무관하게 항상 처리한다.
    @PostMapping("/logout")
    public ResponseEntity<AdminSuccessResponse> logout(HttpServletRequest request) {
        authService.logout(refreshTokenOf(request));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.clearedAccessTokenCookie().toString())
                .header(HttpHeaders.SET_COOKIE, cookieFactory.clearedRefreshTokenCookie().toString())
                .body(new AdminSuccessResponse());
    }

    // access 토큰이 만료됐을 때 쓰는 게 목적이라 matcher 레벨에서 permitAll() — authenticated()를 걸면
    // 자기모순(만료된 걸 갱신하러 왔는데 인증을 요구)이 된다.
    @PostMapping("/refresh")
    public ResponseEntity<AdminSessionResponse> refresh(HttpServletRequest request) {
        AdminAuthService.LoginResult result = authService.refresh(refreshTokenOf(request));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.accessTokenCookie(result.getAccessToken()).toString())
                .body(result.getSession());
    }

    private String refreshTokenOf(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, AdminCookieFactory.REFRESH_TOKEN_COOKIE);
        return cookie == null ? null : cookie.getValue();
    }
}
