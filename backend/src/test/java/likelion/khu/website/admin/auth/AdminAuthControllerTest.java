package likelion.khu.website.admin.auth;

import jakarta.servlet.http.Cookie;
import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminAuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired AdminRepository adminRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Admin createAdmin(String email, String rawPassword) {
        return adminRepository.save(Admin.register(email, "이름", passwordEncoder.encode(rawPassword)));
    }

    @Test
    void login_ValidCredentials_SetsCookiesAndReturnsAccountWithoutToken() throws Exception {
        createAdmin("admin@khu.ac.kr", "password1");

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@khu.ac.kr\",\"password\":\"password1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.admin.email").value("admin@khu.ac.kr"))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().exists("access_token"))
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("access_token", true));
    }

    @Test
    void login_WrongPassword_Returns401() throws Exception {
        createAdmin("admin2@khu.ac.kr", "password1");

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin2@khu.ac.kr\",\"password\":\"wrong-pw\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void login_TenthFailedAttempt_LocksAccountAndBlocksEvenCorrectPassword() throws Exception {
        createAdmin("admin3@khu.ac.kr", "password1");

        for (int i = 0; i < 9; i++) {
            mockMvc.perform(post("/api/admin/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"admin3@khu.ac.kr\",\"password\":\"wrong-pw\"}"));
        }

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin3@khu.ac.kr\",\"password\":\"wrong-pw\"}"))
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin3@khu.ac.kr\",\"password\":\"password1\"}"))
                .andExpect(status().isLocked());
    }

    @Test
    void logout_RevokesRefreshTokenSoSubsequentRefreshFails() throws Exception {
        createAdmin("admin4@khu.ac.kr", "password1");
        MvcResult loginResult = mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin4@khu.ac.kr\",\"password\":\"password1\"}"))
                .andReturn();
        Cookie refreshCookie = loginResult.getResponse().getCookie("refresh_token");

        mockMvc.perform(post("/api/admin/auth/logout").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("access_token", 0))
                .andExpect(cookie().maxAge("refresh_token", 0));

        mockMvc.perform(post("/api/admin/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refresh_NoRefreshCookie_Returns401() throws Exception {
        mockMvc.perform(post("/api/admin/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refresh_ValidRefreshCookie_IssuesNewAccessTokenCookie() throws Exception {
        createAdmin("admin5@khu.ac.kr", "password1");
        MvcResult loginResult = mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin5@khu.ac.kr\",\"password\":\"password1\"}"))
                .andReturn();
        Cookie refreshCookie = loginResult.getResponse().getCookie("refresh_token");

        mockMvc.perform(post("/api/admin/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.admin.email").value("admin5@khu.ac.kr"))
                .andExpect(cookie().exists("access_token"));
    }

    @Test
    void authenticatedRoute_NoCookie_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/invitations"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void adminFeedRoute_NoCookie_NowReturns401() throws Exception {
        // 회귀: #90 이전엔 /api/admin/posts/**가 permitAll()이라 200이었음
        mockMvc.perform(get("/api/admin/posts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void actuatorHealth_NoCookie_StillReturns200() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }
}
