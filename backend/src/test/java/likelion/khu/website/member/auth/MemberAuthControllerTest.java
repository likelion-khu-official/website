package likelion.khu.website.member.auth;

import jakarta.servlet.http.Cookie;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.MemberRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MemberAuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired MemberRepository memberRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Member createMember(String studentId, String phone) {
        Member member = Member.create(
                "시현", Set.of(MemberRole.BE), 13, "🦁", null, null, "admin@likelion.org",
                studentId, phone, passwordEncoder.encode(phone));
        return memberRepository.save(member);
    }

    @Test
    void login_ValidCredentials_SetsCookiesAndReturnsAccountWithMustChangePasswordTrue() throws Exception {
        createMember("2020000001", "01000000001");

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000001\",\"password\":\"01000000001\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.studentId").value("2020000001"))
                .andExpect(jsonPath("$.member.mustChangePassword").value(true))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(cookie().exists("access_token"))
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("access_token", true));
    }

    @Test
    void login_WrongPassword_Returns401() throws Exception {
        createMember("2020000002", "01000000002");

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000002\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void login_FifthFailedAttempt_LocksAccount() throws Exception {
        createMember("2020000003", "01000000003");

        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/member/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"studentId\":\"2020000003\",\"password\":\"wrong\"}"));
        }

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000003\",\"password\":\"wrong\"}"))
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000003\",\"password\":\"01000000003\"}"))
                .andExpect(status().isLocked());
    }

    @Test
    void logout_RevokesRefreshTokenSoSubsequentRefreshFails() throws Exception {
        createMember("2020000004", "01000000004");
        MvcResult loginResult = mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000004\",\"password\":\"01000000004\"}"))
                .andReturn();
        Cookie refreshCookie = loginResult.getResponse().getCookie("refresh_token");

        mockMvc.perform(post("/api/member/auth/logout").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("access_token", 0))
                .andExpect(cookie().maxAge("refresh_token", 0));

        mockMvc.perform(post("/api/member/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refresh_NoRefreshCookie_Returns401() throws Exception {
        mockMvc.perform(post("/api/member/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refresh_ValidRefreshCookie_IssuesNewAccessTokenCookie() throws Exception {
        createMember("2020000005", "01000000005");
        MvcResult loginResult = mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000005\",\"password\":\"01000000005\"}"))
                .andReturn();
        Cookie refreshCookie = loginResult.getResponse().getCookie("refresh_token");

        mockMvc.perform(post("/api/member/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.studentId").value("2020000005"))
                .andExpect(cookie().exists("access_token"));
    }

    @Test
    void mustChangePassword_BlocksOtherApiButAllowsPasswordChange() throws Exception {
        createMember("2020000006", "01000000006");
        MvcResult loginResult = mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000006\",\"password\":\"01000000006\"}"))
                .andReturn();
        Cookie accessCookie = loginResult.getResponse().getCookie("access_token");

        // 첫 로그인 상태 — 비번 변경 전엔 다른 API가 막힌다
        mockMvc.perform(get("/api/admin/posts").cookie(accessCookie))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

        // 비번 변경 엔드포인트 자체는 열려 있다 — 새 토큰 쌍을 즉시 내려준다
        MvcResult changeResult = mockMvc.perform(patch("/api/member/auth/password")
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"newPassword1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.mustChangePassword").value(false))
                .andReturn();
        Cookie newAccessCookie = changeResult.getResponse().getCookie("access_token");

        // 새 access 토큰으론 더 이상 막히지 않는다
        mockMvc.perform(get("/api/admin/posts").cookie(newAccessCookie))
                .andExpect(status().isOk());

        // 예전 비밀번호로는 더 이상 로그인이 안 된다
        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000006\",\"password\":\"01000000006\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedRoute_NoCookie_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/posts"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Autowired MemberAuthService memberAuthService;

    @Test
    void resetPasswordByAdmin_RevertsToPhoneAndRequiresChangeAgain() throws Exception {
        Member member = createMember("2020000007", "01000000007");
        // 본인이 비번을 한 번 바꾼 뒤
        memberAuthService.changePassword(member.getId(), "changedPassword1");

        // 관리자가 초기화하면
        memberAuthService.resetPasswordByAdmin(member.getId());

        // 전화번호로 다시 로그인되고, 다시 첫 로그인(강제 변경) 상태가 된다
        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000007\",\"password\":\"01000000007\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.mustChangePassword").value(true));

        // 바꿨던 비번으로는 더 이상 로그인이 안 된다
        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000007\",\"password\":\"changedPassword1\"}"))
                .andExpect(status().isUnauthorized());
    }
}
