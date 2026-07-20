package likelion.khu.website.member.auth;

import jakarta.servlet.http.Cookie;
import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.admin.auth.JwtProvider;
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

import java.time.LocalDateTime;
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
    @Autowired JwtProvider jwtProvider;
    @Autowired MemberRefreshTokenRepository memberRefreshTokenRepository;

    private Member createMember(String studentId, String phone) {
        Member member = Member.create(
                "시현", Set.of(MemberRole.BE), 13, "🦁", null, null, "admin@likelion.org",
                studentId, phone, passwordEncoder.encode(phone));
        return memberRepository.save(member);
    }

    // MemberAuthService#hash()와 동일한 알고리즘 — DB에 저장된 토큰 행을 테스트에서 직접
    // 조작하려면(예: 강제 만료) 서비스가 실제로 찾는 것과 같은 해시로 저장돼 있어야 한다.
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
    void login_ValidCredentials_SetsCookiesAndReturnsAccountWithMustChangePasswordTrue() throws Exception {
        createMember("2020000001", "01000000001");

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000001\",\"password\":\"01000000001\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.studentId").value("2020000001"))
                .andExpect(jsonPath("$.member.mustChangePassword").value(true))
                .andExpect(jsonPath("$.member.role").value("MEMBER"))
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

    // 상태공간트리 QA에서 찾은 빈틈 — 로그아웃은 permitAll이고 서비스도 refreshToken==null이면
    // 그냥 no-op이라, 쿠키가 아예 없어도(=로그인한 적 없는 방문자가 눌러도) 200이 나와야 정상이다.
    @Test
    void logout_NoCookie_StillReturns200() throws Exception {
        mockMvc.perform(post("/api/member/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // 상태공간트리 QA — refresh_token 쿠키에 아무 의미 없는 문자열이 들어있어도(로그인한 적 없는
    // 브라우저에 이상한 쿠키가 남아있는 경우 등) 로그아웃은 여전히 no-op으로 200이어야 한다.
    @Test
    void logout_GarbageCookie_StillReturns200() throws Exception {
        mockMvc.perform(post("/api/member/auth/logout")
                        .cookie(new Cookie("refresh_token", "not-a-real-jwt")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // 상태공간트리 QA에서 찾은 빈틈 — /api/member/auth/password는 permitAll 목록에 없어
    // 쿠키(SecurityContext) 자체가 없으면 hasRole('MEMBER') 이전에 401로 막혀야 한다.
    @Test
    void changePassword_NoCookie_Returns401() throws Exception {
        mockMvc.perform(patch("/api/member/auth/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"x\",\"newPassword\":\"newPassword1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
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

    // 상태공간트리 QA — DB에 저장된 refresh 토큰 행 자체가 만료된 경우. JWT 자체의 exp(7일)와는
    // 별개로 member_refresh_tokens.expires_at을 직접 확인하는 MemberRefreshToken.isValid()의
    // "만료" 분기 — 지금까진 logout으로 revoked=true 되는 분기만 테스트돼 있었다.
    @Test
    void refresh_ExpiredStoredToken_Returns401() throws Exception {
        Member member = createMember("2020000011", "01000000011");
        String refreshToken = jwtProvider.createRefreshToken(member);
        memberRefreshTokenRepository.save(
                MemberRefreshToken.issue(member.getId(), hash(refreshToken), LocalDateTime.now().minusSeconds(1)));

        mockMvc.perform(post("/api/member/auth/refresh")
                        .cookie(new Cookie("refresh_token", refreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    // 상태공간트리 QA — access 토큰을 refresh 자리에 넣어 보내면(typ 클레임이 access) 막혀야
    // 한다. DB 조회까지 가지도 않고 jwtProvider.isRefreshToken() 필터에서 먼저 걸러진다.
    @Test
    void refresh_AccessTokenUsedAsRefreshToken_Returns401() throws Exception {
        Member member = createMember("2020000012", "01000000012");
        String accessToken = jwtProvider.createAccessToken(member);

        mockMvc.perform(post("/api/member/auth/refresh")
                        .cookie(new Cookie("refresh_token", accessToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    // 상태공간트리 QA — 서명 검증조차 실패하는 문자열. jwtProvider.parseClaims()가
    // Optional.empty()를 돌려주는 지점부터 이미 걸러진다(DB 조회 자체가 안 일어남).
    @Test
    void refresh_GarbageCookie_Returns401() throws Exception {
        mockMvc.perform(post("/api/member/auth/refresh")
                        .cookie(new Cookie("refresh_token", "not-a-real-jwt")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void mustChangePassword_BlocksMemberNamespaceButAllowsPublicApiAndPasswordChange() throws Exception {
        createMember("2020000006", "01000000006");
        MvcResult loginResult = mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000006\",\"password\":\"01000000006\"}"))
                .andReturn();
        Cookie accessCookie = loginResult.getResponse().getCookie("access_token");

        // 완전 공개 API(GET /api/posts)는 mustChangePassword=true여도 막히면 안 된다 — 가드가
        // 한때 전역으로 걸려서, 익명 방문자도 보는 공개 피드를 로그인한 신규 멤버만 못 보는 회귀가 있었다.
        mockMvc.perform(get("/api/posts").cookie(accessCookie))
                .andExpect(status().isOk());

        // 멤버 네임스페이스(/api/member/**, 인증 모듈 자기 자신 제외)는 여전히 막힌다. 지금 코드베이스엔
        // 아직 실제 멤버 전용 API(글쓰기·프로필 편집 등)가 없어서, 가상 경로로 가드 로직 자체를 검증한다 —
        // 나중에 진짜 멤버 전용 API가 생기면 이 경로를 그걸로 바꾸면 된다.
        mockMvc.perform(patch("/api/member/profile").cookie(accessCookie))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

        // 비번 변경 엔드포인트 자체는 열려 있다 — 새 토큰 쌍을 즉시 내려준다
        MvcResult changeResult = mockMvc.perform(patch("/api/member/auth/password")
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"01000000006\",\"newPassword\":\"newPassword1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.mustChangePassword").value(false))
                .andReturn();
        Cookie newAccessCookie = changeResult.getResponse().getCookie("access_token");

        // 새 access 토큰으론 더 이상 가드에 안 걸린다 — 실존하지 않는 경로라 404로 통과한다
        // (더는 403 MUST_CHANGE_PASSWORD가 아니라는 게 핵심).
        mockMvc.perform(patch("/api/member/profile").cookie(newAccessCookie))
                .andExpect(status().isNotFound());

        // 예전 비밀번호로는 더 이상 로그인이 안 된다
        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000006\",\"password\":\"01000000006\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_WithStaleMustChangePasswordAccessTokenCookie_StillSucceeds() throws Exception {
        // 만료 안 된 mustChangePassword=true access_token 쿠키를 들고 로그인을 시도해도(같은
        // 브라우저에서 로그인 폼을 다시 제출하는 등) 로그인 자체가 막히면 안 된다 — 예전엔
        // ALLOWED_PATHS에 /api/member/auth/login이 빠져 있어 이 경우 403이 났었다.
        // 서로 다른 두 멤버를 쓴다 — 같은 멤버를 밀리초 안에 두 번 로그인시키면 JWT의 iat까지
        // 완전히 같아져 refresh 토큰 문자열이 동일해지고 token_hash UNIQUE 제약과 충돌하는
        // 별도 문제가 있다(#97부터 물려받은 JwtProvider 패턴, 이 테스트가 검증할 대상이 아님).
        createMember("2020000009", "01000000009");
        createMember("2020000010", "01000000010");
        MvcResult firstLogin = mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000009\",\"password\":\"01000000009\"}"))
                .andReturn();
        Cookie staleAccessCookie = firstLogin.getResponse().getCookie("access_token");

        mockMvc.perform(post("/api/member/auth/login")
                        .cookie(staleAccessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000010\",\"password\":\"01000000010\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void changePassword_WrongCurrentPassword_Returns401AndDoesNotChangeIt() throws Exception {
        createMember("2020000008", "01000000008");
        MvcResult loginResult = mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000008\",\"password\":\"01000000008\"}"))
                .andReturn();
        Cookie accessCookie = loginResult.getResponse().getCookie("access_token");

        mockMvc.perform(patch("/api/member/auth/password")
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrong\",\"newPassword\":\"newPassword1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        // 여전히 전화번호(원래 초기 비번) 해시 그대로다 — 비번이 안 바뀌었다.
        // (재로그인으로 검증하지 않는다 — 같은 유저를 밀리초 안에 두 번 로그인시키면 JWT의 iat까지
        // 완전히 같아져 refresh 토큰 문자열이 동일해지고, token_hash UNIQUE 제약과 충돌하는 별도
        // 문제가 있다. #97부터 물려받은 JwtProvider 패턴의 문제라 여기서 우회하고 별도 보고한다.)
        Member unchanged = memberRepository.findByStudentId("2020000008").orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(
                passwordEncoder.matches("01000000008", unchanged.getPasswordHash()));
    }

    // 상태공간트리 QA — 현재 비번은 맞는데 새 비번이 AdminPasswordPolicy(8자+영문+숫자)에
    // 못 미치면 400. currentPassword 검증 다음, changePassword() 적용 이전에 막혀야 한다.
    @Test
    void changePassword_WeakNewPassword_Returns400() throws Exception {
        createMember("2020000013", "01000000013");
        MvcResult loginResult = mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020000013\",\"password\":\"01000000013\"}"))
                .andReturn();
        Cookie accessCookie = loginResult.getResponse().getCookie("access_token");

        mockMvc.perform(patch("/api/member/auth/password")
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"01000000013\",\"newPassword\":\"12345678\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("WEAK_PASSWORD"));
    }

    // 상태공간트리 QA — 인증은 됐지만(쿠키 있음, 401 아님) 역할이 MEMBER가 아닌 경우.
    // hasRole('MEMBER') 불충족으로 403 FORBIDDEN — changePassword_NoCookie_Returns401(미인증)과
    // 대비되는, "인증은 됐지만 권한이 없는" 경계 케이스.
    @Test
    @WithMockAdminUser(role = "ADMIN")
    void changePassword_AdminRole_Returns403() throws Exception {
        mockMvc.perform(patch("/api/member/auth/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"x\",\"newPassword\":\"newPassword1\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    // 미인증(쿠키 없음) → 401은 AdminAuthControllerTest.adminFeedRoute_NoCookie_NowReturns401()가
    // 이미 같은 엔드포인트(/api/admin/posts)로 검증한다 — 멤버 인증과 무관한 Spring Security 자체
    // 동작이라 여기서 중복 검증하지 않는다.

    @Autowired MemberAuthService memberAuthService;

    @Test
    void resetPasswordByAdmin_RevertsToPhoneAndRequiresChangeAgain() throws Exception {
        Member member = createMember("2020000007", "01000000007");
        // 본인이 비번을 한 번 바꾼 뒤
        memberAuthService.changePassword(member.getId(), "01000000007", "changedPassword1");

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
