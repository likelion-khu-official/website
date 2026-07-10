package likelion.khu.website.admin.password;

import jakarta.validation.Valid;
import likelion.khu.website.admin.dto.AdminSuccessResponse;
import likelion.khu.website.admin.password.dto.AdminPasswordForgotRequest;
import likelion.khu.website.admin.password.dto.AdminPasswordForgotResponse;
import likelion.khu.website.admin.password.dto.AdminPasswordResetRequest;
import likelion.khu.website.admin.password.dto.AdminPasswordVerifyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// 전부 로그인 전 흐름(비밀번호를 잊은 상태) — permitAll()
@RestController
@RequestMapping("/api/admin/password")
@RequiredArgsConstructor
public class AdminPasswordController {

    private final AdminPasswordResetService passwordResetService;

    @PostMapping("/forgot")
    public AdminPasswordForgotResponse forgot(@Valid @RequestBody AdminPasswordForgotRequest request) {
        return new AdminPasswordForgotResponse(passwordResetService.forgot(request.getEmail()));
    }

    @GetMapping("/reset/{token}/verify")
    public AdminPasswordVerifyResponse verify(@PathVariable String token) {
        return passwordResetService.verify(token);
    }

    @PostMapping("/reset/{token}")
    public AdminSuccessResponse reset(@PathVariable String token, @Valid @RequestBody AdminPasswordResetRequest request) {
        passwordResetService.reset(token, request.getPassword());
        return new AdminSuccessResponse();
    }
}
