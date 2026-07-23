package likelion.khu.website.member;

import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.member.auth.MemberAuthService;
import likelion.khu.website.member.dto.MemberAdminResponse;
import likelion.khu.website.member.dto.MemberCreateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MemberControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired MemberService memberService;
    @Autowired MemberAuthService memberAuthService;

    private Long createMember() {
        MemberCreateRequest req = new MemberCreateRequest();
        req.setName("시현");
        req.setRoles(Set.of(MemberRole.BE));
        req.setCohort(13);
        req.setStudentId("2020123456");
        req.setPhone("01000000000");
        MemberAdminResponse res = memberService.create(req, "admin@likelion.org");
        return res.getId();
    }

    // ── GET /api/members ─────────────────────────────────────────────

    @Test
    void listMembers_Public_Returns200() throws Exception {
        createMember();

        mockMvc.perform(get("/api/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("시현"))
                .andExpect(jsonPath("$[0].emoji").isNotEmpty())
                .andExpect(jsonPath("$[0].cohort").value(13));
    }

    @Test
    void listMembers_DoesNotExposeCreatedBy() throws Exception {
        createMember();

        mockMvc.perform(get("/api/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].createdBy").doesNotExist())
                .andExpect(jsonPath("$[0].updatedBy").doesNotExist());
    }

    // ── POST /api/admin/members ───────────────────────────────────────

    @WithMockAdminUser
    @Test
    void createMember_SuperAdmin_Returns201() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("선우"))
                .andExpect(jsonPath("$.cohort").value(13))
                .andExpect(jsonPath("$.emoji").isNotEmpty())
                .andExpect(jsonPath("$.createdBy").doesNotExist());
    }

    // 위키 "정보구조와 권한" 기준 등록은 최고관리자 전용이 아니라 ADMIN 이상 공용 권한이다(#145).
    @WithMockAdminUser(role = "ADMIN")
    @Test
    void createMember_ByRegularAdmin_Returns201() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isCreated());
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void createMember_ByMember_Returns403() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void createMember_Unauthenticated_Returns4xx() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().is4xxClientError());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createMember_MissingName_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roles\":[\"BE\"],\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createMember_MissingRoles_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"cohort\":13,\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createMember_MissingCohort_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"studentId\":\"2020111111\",\"phone\":\"01011112222\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createMember_MissingStudentId_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13,\"phone\":\"01011112222\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockAdminUser
    @Test
    void createMember_DuplicateStudentId_Returns409() throws Exception {
        createMember();

        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"또다른시현\",\"roles\":[\"BE\"],\"cohort\":13,\"studentId\":\"2020123456\",\"phone\":\"01099998888\"}"))
                .andExpect(status().isConflict());
    }

    // ── PATCH /api/admin/members/{id} ────────────────────────────────

    @WithMockAdminUser
    @Test
    void updateMember_SuperAdmin_Returns200() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"시현(수정)\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("시현(수정)"))
                .andExpect(jsonPath("$.cohort").value(13));
    }

    // 위키 "정보구조와 권한" 기준 수정도 최고관리자 전용이 아니라 ADMIN 이상 공용 권한이다(#145).
    @WithMockAdminUser(role = "ADMIN")
    @Test
    void updateMember_ByRegularAdmin_Returns200() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"수정시도\"}"))
                .andExpect(status().isOk());
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void updateMember_ByMember_Returns403() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"수정시도\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateMember_Unauthenticated_Returns4xx() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"수정시도\"}"))
                .andExpect(status().is4xxClientError());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void updateMember_EmptyName_Returns400() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockAdminUser
    @Test
    void updateMember_EmptyPhotoUrl_ClearsPhoto() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"photoUrl\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").doesNotExist());
    }

    @WithMockAdminUser
    @Test
    void updateMember_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(patch("/api/admin/members/{id}", 9999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"없는사람\"}"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/admin/members/{id}/password/reset ─────────────────────

    @WithMockAdminUser(role = "ADMIN")
    @Test
    void resetPassword_ByRegularAdmin_Returns200() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/password/reset", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void resetPassword_ByMember_Returns403() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/password/reset", id))
                .andExpect(status().isForbidden());
    }

    @Test
    void resetPassword_Unauthenticated_Returns4xx() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/password/reset", id))
                .andExpect(status().is4xxClientError());
    }

    @WithMockAdminUser
    @Test
    void resetPassword_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(post("/api/admin/members/{id}/password/reset", 9999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    // ── GET /api/admin/members ───────────────────────────────────────

    @WithMockAdminUser(role = "ADMIN")
    @Test
    void adminList_ByRegularAdmin_IncludesStudentId() throws Exception {
        createMember();

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentId").value("2020123456"))
                .andExpect(jsonPath("$[0].offboarded").value(false));
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void adminList_ByMember_Returns403() throws Exception {
        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminList_Unauthenticated_Returns4xx() throws Exception {
        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().is4xxClientError());
    }

    // ── POST /api/admin/members/{id}/offboard ────────────────────────

    @WithMockAdminUser(role = "ADMIN")
    @Test
    void offboard_ByRegularAdmin_Returns200AndMarksOffboarded() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/offboard", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(jsonPath("$[0].offboarded").value(true));
    }

    @WithMockUser(roles = "MEMBER")
    @Test
    void offboard_ByMember_Returns403() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/offboard", id))
                .andExpect(status().isForbidden());
    }

    @Test
    void offboard_Unauthenticated_Returns4xx() throws Exception {
        Long id = createMember();

        mockMvc.perform(post("/api/admin/members/{id}/offboard", id))
                .andExpect(status().is4xxClientError());
    }

    @WithMockAdminUser
    @Test
    void offboard_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(post("/api/admin/members/{id}/offboard", 9999L))
                .andExpect(status().isNotFound());
    }

    @WithMockAdminUser
    @Test
    void offboardedMember_CannotLogin() throws Exception {
        Long id = createMember();
        memberAuthService.offboard(id);

        mockMvc.perform(post("/api/member/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"2020123456\",\"password\":\"01000000000\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }
}
