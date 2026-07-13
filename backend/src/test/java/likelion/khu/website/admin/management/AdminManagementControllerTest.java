package likelion.khu.website.admin.management;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.admin.WithMockAdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AdminManagementControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired AdminRepository adminRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Admin createAdmin(String email, AdminRole role) {
        return adminRepository.save(Admin.register(email, "이름", passwordEncoder.encode("password1"), role));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void list_ReturnsActiveStatusForNormalAdmin() throws Exception {
        createAdmin("normal@khu.ac.kr", AdminRole.ADMIN);

        mockMvc.perform(get("/api/admin/admins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='normal@khu.ac.kr')].status").value("ACTIVE"));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void remove_LastSuperAdmin_Returns409() throws Exception {
        Admin lastSuper = createAdmin("last-super@khu.ac.kr", AdminRole.SUPER_ADMIN);

        mockMvc.perform(delete("/api/admin/admins/{id}", lastSuper.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LAST_SUPER_ADMIN"));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void remove_NonLastSuperAdmin_Succeeds() throws Exception {
        createAdmin("super-a@khu.ac.kr", AdminRole.SUPER_ADMIN);
        Admin superB = createAdmin("super-b@khu.ac.kr", AdminRole.SUPER_ADMIN);

        mockMvc.perform(delete("/api/admin/admins/{id}", superB.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void remove_UnknownId_Returns404() throws Exception {
        mockMvc.perform(delete("/api/admin/admins/{id}", 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void changeRole_LastSuperAdminDemote_Returns409() throws Exception {
        Admin lastSuper = createAdmin("only-super@khu.ac.kr", AdminRole.SUPER_ADMIN);

        mockMvc.perform(patch("/api/admin/admins/{id}/role", lastSuper.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LAST_SUPER_ADMIN"));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void changeRole_PromoteRegularAdmin_Succeeds() throws Exception {
        Admin admin = createAdmin("to-promote@khu.ac.kr", AdminRole.ADMIN);

        mockMvc.perform(patch("/api/admin/admins/{id}/role", admin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"SUPER_ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("SUPER_ADMIN"));
    }

    @Test
    @WithMockAdminUser(role = "ADMIN")
    void remove_CalledByRegularAdmin_Returns403() throws Exception {
        Admin admin = createAdmin("target@khu.ac.kr", AdminRole.ADMIN);

        mockMvc.perform(delete("/api/admin/admins/{id}", admin.getId()))
                .andExpect(status().isForbidden());
    }
}
