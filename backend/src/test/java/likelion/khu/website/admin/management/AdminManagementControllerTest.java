package likelion.khu.website.admin.management;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.WithMockAdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminManagementControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired AdminRepository adminRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Admin createAdmin(String email) {
        return adminRepository.save(Admin.register(email, "이름", passwordEncoder.encode("password1")));
    }

    @Test
    @WithMockAdminUser
    void list_ReturnsActiveStatusForNormalAdmin() throws Exception {
        createAdmin("normal@khu.ac.kr");

        mockMvc.perform(get("/api/admin/admins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='normal@khu.ac.kr')].status").value("ACTIVE"));
    }

    @Test
    @WithMockAdminUser
    void remove_LastAdmin_Returns409() throws Exception {
        Admin lastAdmin = createAdmin("last-admin@khu.ac.kr");

        mockMvc.perform(delete("/api/admin/admins/{id}", lastAdmin.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LAST_ADMIN"));
    }

    @Test
    @WithMockAdminUser
    void remove_NotLastAdmin_Succeeds() throws Exception {
        createAdmin("admin-a@khu.ac.kr");
        Admin adminB = createAdmin("admin-b@khu.ac.kr");

        mockMvc.perform(delete("/api/admin/admins/{id}", adminB.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockAdminUser
    void remove_UnknownId_Returns404() throws Exception {
        mockMvc.perform(delete("/api/admin/admins/{id}", 999999L))
                .andExpect(status().isNotFound());
    }
}
