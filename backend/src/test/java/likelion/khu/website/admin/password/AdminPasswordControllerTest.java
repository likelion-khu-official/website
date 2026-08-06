package likelion.khu.website.admin.password;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.auth.RefreshToken;
import likelion.khu.website.admin.auth.RefreshTokenRepository;
import likelion.khu.website.email.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminPasswordControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired AdminRepository adminRepository;
    @Autowired PasswordResetTokenRepository tokenRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @MockitoBean
    EmailService emailService;

    // AdminPasswordResetService#hash()와 동일한 알고리즘 — 서비스가 URL의 원문 토큰을 해시해서
    // 찾는 것과 같은 값으로 DB에 시드해야 한다.
    private String hash(String token) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(bytes);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void forgot_ExistingEmail_SendsResetEmail() throws Exception {
        adminRepository.save(
                Admin.register("exists@khu.ac.kr", "이름", passwordEncoder.encode("password1")));

        mockMvc.perform(post("/api/admin/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"exists@khu.ac.kr\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("메일이 발송되었어요."));

        verify(emailService, times(1)).sendPasswordResetEmail(anyString(), anyString(), any(LocalDateTime.class));
    }

    @Test
    void forgot_NonExistingEmail_ReturnsIdenticalResponseWithoutSendingEmail() throws Exception {
        mockMvc.perform(post("/api/admin/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@khu.ac.kr\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("메일이 발송되었어요."));

        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), any(LocalDateTime.class));
    }

    @Test
    void reset_ValidToken_ChangesPasswordAndRevokesExistingRefreshTokens() throws Exception {
        Admin admin = adminRepository.save(
                Admin.register("reset@khu.ac.kr", "이름", passwordEncoder.encode("oldpassword1")));
        refreshTokenRepository.save(RefreshToken.issue(admin.getId(), "some-hash", LocalDateTime.now().plusDays(7)));
        tokenRepository.save(
                PasswordResetToken.issue(admin.getId(), hash("reset-token"), Duration.ofMinutes(30)));

        mockMvc.perform(post("/api/admin/password/reset/{token}", "reset-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"newpassword1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 로그인(아래)이 새 refresh 토큰을 발급하기 전에, reset이 기존 토큰을 revoke했는지부터 확인
        assertThat(refreshTokenRepository.findAllByAdminIdAndRevokedFalse(admin.getId())).isEmpty();

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"reset@khu.ac.kr\",\"password\":\"newpassword1\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void forgot_DuplicateRequestWithin30Min_SendsEmailOnlyOnce() throws Exception {
        adminRepository.save(
                Admin.register("ratelimit@khu.ac.kr", "이름", passwordEncoder.encode("password1")));

        mockMvc.perform(post("/api/admin/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ratelimit@khu.ac.kr\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("메일이 발송되었어요."));

        mockMvc.perform(post("/api/admin/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ratelimit@khu.ac.kr\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("메일이 발송되었어요."));

        verify(emailService, times(1)).sendPasswordResetEmail(anyString(), anyString(), any(LocalDateTime.class));
    }

    @Test
    void forgot_UpperCaseEmail_NormalizesToLowercaseAndFindsAdmin() throws Exception {
        adminRepository.save(
                Admin.register("normalize@khu.ac.kr", "이름", passwordEncoder.encode("password1")));

        mockMvc.perform(post("/api/admin/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"NORMALIZE@khu.ac.kr\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("메일이 발송되었어요."));

        verify(emailService, times(1)).sendPasswordResetEmail(anyString(), anyString(), any(LocalDateTime.class));
    }

    @Test
    void reset_ExpiredToken_Returns410() throws Exception {
        Admin admin = adminRepository.save(
                Admin.register("expired@khu.ac.kr", "이름", passwordEncoder.encode("password1")));
        tokenRepository.save(
                PasswordResetToken.issue(admin.getId(), hash("expired-token"), Duration.ofMillis(-1)));

        mockMvc.perform(post("/api/admin/password/reset/{token}", "expired-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"newpassword1\"}"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("EXPIRED_TOKEN"));
    }

    @Test
    void reset_WeakPassword_Returns400() throws Exception {
        Admin admin = adminRepository.save(
                Admin.register("weak@khu.ac.kr", "이름", passwordEncoder.encode("password1")));
        tokenRepository.save(
                PasswordResetToken.issue(admin.getId(), hash("weak-token"), Duration.ofMinutes(30)));

        mockMvc.perform(post("/api/admin/password/reset/{token}", "weak-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("WEAK_PASSWORD"));
    }

    @Test
    void reset_AlreadyUsedToken_Returns400() throws Exception {
        Admin admin = adminRepository.save(
                Admin.register("used@khu.ac.kr", "이름", passwordEncoder.encode("password1")));
        tokenRepository.save(
                PasswordResetToken.issue(admin.getId(), hash("used-token"), Duration.ofMinutes(30)));
        mockMvc.perform(post("/api/admin/password/reset/{token}", "used-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"firstpassword1\"}"));

        mockMvc.perform(post("/api/admin/password/reset/{token}", "used-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"secondpassword1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }
}
