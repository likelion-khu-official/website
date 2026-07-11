package likelion.khu.website.member;

import likelion.khu.website.member.dto.MemberCreateRequest;
import likelion.khu.website.member.dto.MemberResponse;
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

    private Long createMember() {
        MemberCreateRequest req = new MemberCreateRequest();
        req.setName("시현");
        req.setRoles(Set.of(MemberRole.BE));
        req.setCohort(13);
        MemberResponse res = memberService.create(req, "admin@likelion.org");
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

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createMember_SuperAdmin_Returns201() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("선우"))
                .andExpect(jsonPath("$.cohort").value(13))
                .andExpect(jsonPath("$.emoji").isNotEmpty())
                .andExpect(jsonPath("$.createdBy").doesNotExist());
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void createMember_NotSuperAdmin_Returns403() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void createMember_Unauthenticated_Returns4xx() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"],\"cohort\":13}"))
                .andExpect(status().is4xxClientError());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createMember_MissingName_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roles\":[\"BE\"],\"cohort\":13}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createMember_MissingRoles_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"cohort\":13}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createMember_MissingCohort_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"선우\",\"roles\":[\"BE\"]}"))
                .andExpect(status().isBadRequest());
    }

    // ── PATCH /api/admin/members/{id} ────────────────────────────────

    @WithMockUser(roles = "SUPER_ADMIN")
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

    @WithMockUser(roles = "ADMIN")
    @Test
    void updateMember_NotSuperAdmin_Returns403() throws Exception {
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

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void updateMember_EmptyPhotoUrl_ClearsPhoto() throws Exception {
        Long id = createMember();

        mockMvc.perform(patch("/api/admin/members/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"photoUrl\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").doesNotExist());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void updateMember_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(patch("/api/admin/members/{id}", 9999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"없는사람\"}"))
                .andExpect(status().isNotFound());
    }
}
