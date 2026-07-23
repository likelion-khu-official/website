package likelion.khu.website.staff;

import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.staff.dto.StaffCreateRequest;
import likelion.khu.website.staff.dto.StaffResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class StaffControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired StaffService staffService;

    private static final String CREATE_BODY =
            "{\"name\":\"시현\",\"position\":\"회장\",\"department\":\"컴퓨터공학과\"," +
                    "\"admissionYear\":22,\"photoUrl\":\"https://example.com/photo.jpg\",\"sortOrder\":1}";

    private Long createStaff() {
        StaffCreateRequest req = new StaffCreateRequest();
        req.setName("시현");
        req.setPosition("회장");
        req.setDepartment("컴퓨터공학과");
        req.setAdmissionYear(22);
        req.setPhotoUrl("https://example.com/photo.jpg");
        req.setSortOrder(1);
        StaffResponse res = staffService.create(req, "admin@likelion.org");
        return res.getId();
    }

    // ── GET /api/staff ────────────────────────────────────────────────

    @Test
    void listStaff_Public_Returns200() throws Exception {
        createStaff();

        mockMvc.perform(get("/api/staff"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("시현"))
                .andExpect(jsonPath("$[0].position").value("회장"))
                .andExpect(jsonPath("$[0].admissionYear").value(22));
    }

    @Test
    void listStaff_DoesNotExposeCreatedBy() throws Exception {
        createStaff();

        mockMvc.perform(get("/api/staff"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].createdBy").doesNotExist())
                .andExpect(jsonPath("$[0].updatedBy").doesNotExist());
    }

    // ── POST /api/admin/staff ────────────────────────────────────────

    @WithMockAdminUser
    @Test
    void createStaff_SuperAdmin_Returns201() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("시현"))
                .andExpect(jsonPath("$.sortOrder").value(1))
                .andExpect(jsonPath("$.createdBy").doesNotExist());
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void createStaff_NotSuperAdmin_Returns403() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void createStaff_Unauthenticated_Returns4xx() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().is4xxClientError());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createStaff_MissingPhotoUrl_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"시현\",\"position\":\"회장\",\"department\":\"컴퓨터공학과\"," +
                                "\"admissionYear\":22,\"sortOrder\":1}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void createStaff_MissingName_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"position\":\"회장\",\"department\":\"컴퓨터공학과\"," +
                                "\"admissionYear\":22,\"photoUrl\":\"https://example.com/photo.jpg\",\"sortOrder\":1}"))
                .andExpect(status().isBadRequest());
    }

    // ── PATCH /api/admin/staff/{id} ──────────────────────────────────

    @WithMockAdminUser
    @Test
    void updateStaff_SuperAdmin_Returns200() throws Exception {
        Long id = createStaff();

        mockMvc.perform(patch("/api/admin/staff/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"position\":\"부회장\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.position").value("부회장"))
                .andExpect(jsonPath("$.name").value("시현"));
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void updateStaff_NotSuperAdmin_Returns403() throws Exception {
        Long id = createStaff();

        mockMvc.perform(patch("/api/admin/staff/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"position\":\"부회장\"}"))
                .andExpect(status().isForbidden());
    }

    @WithMockUser(roles = "SUPER_ADMIN")
    @Test
    void updateStaff_EmptyPhotoUrl_Returns400() throws Exception {
        Long id = createStaff();

        mockMvc.perform(patch("/api/admin/staff/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"photoUrl\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @WithMockAdminUser
    @Test
    void updateStaff_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(patch("/api/admin/staff/{id}", 9999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"position\":\"부회장\"}"))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/admin/staff/{id} ─────────────────────────────────

    @WithMockAdminUser
    @Test
    void deleteStaff_SuperAdmin_Returns204() throws Exception {
        Long id = createStaff();

        mockMvc.perform(delete("/api/admin/staff/{id}", id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/staff"))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @WithMockUser(roles = "ADMIN")
    @Test
    void deleteStaff_NotSuperAdmin_Returns403() throws Exception {
        Long id = createStaff();

        mockMvc.perform(delete("/api/admin/staff/{id}", id))
                .andExpect(status().isForbidden());
    }

    @WithMockAdminUser
    @Test
    void deleteStaff_NonExistentId_Returns404() throws Exception {
        mockMvc.perform(delete("/api/admin/staff/{id}", 9999L))
                .andExpect(status().isNotFound());
    }
}