package likelion.khu.website.admin.management;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.admin.auth.AdminPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminManagementControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired AdminRepository adminRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Admin createAdmin(String email, AdminRole role) {
        return adminRepository.save(Admin.register(email, "이름", passwordEncoder.encode("password1"), role));
    }

    // 승계(handover)는 principal.id로 실제 Admin 행을 찾아야 해서, id를 컴파일타임 상수로만
    // 받는 @WithMockAdminUser로는 표현이 안 된다 — 방금 저장한 admin의 실제 id로 인증 컨텍스트를 심는다.
    private void authenticateAs(Admin admin) {
        AdminPrincipal principal = new AdminPrincipal(admin.getId(), admin.getEmail(), admin.getRole().name(), false);
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + admin.getRole().name()));
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, authorities));
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

    // ── 최고관리자 승계(#147) ────────────────────────────────────────

    @Test
    void handover_Success_SwapsRolesAtomically() throws Exception {
        Admin current = createAdmin("current-super@khu.ac.kr", AdminRole.SUPER_ADMIN);
        Admin target = createAdmin("next-super@khu.ac.kr", AdminRole.ADMIN);
        authenticateAs(current);

        mockMvc.perform(post("/api/admin/admins/{id}/handover", target.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newSuperAdmin.id").value(target.getId()))
                .andExpect(jsonPath("$.newSuperAdmin.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.formerSuperAdmin.id").value(current.getId()))
                .andExpect(jsonPath("$.formerSuperAdmin.role").value("ADMIN"));

        assertThat(adminRepository.findById(target.getId()).orElseThrow().getRole()).isEqualTo(AdminRole.SUPER_ADMIN);
        assertThat(adminRepository.findById(current.getId()).orElseThrow().getRole()).isEqualTo(AdminRole.ADMIN);
    }

    @Test
    void handover_SelfTarget_Returns400AndNothingChanges() throws Exception {
        Admin current = createAdmin("only-super@khu.ac.kr", AdminRole.SUPER_ADMIN);
        authenticateAs(current);

        mockMvc.perform(post("/api/admin/admins/{id}/handover", current.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("HANDOVER_SELF_TARGET"));

        assertThat(adminRepository.findById(current.getId()).orElseThrow().getRole()).isEqualTo(AdminRole.SUPER_ADMIN);
    }

    @Test
    void handover_TargetNotAdmin_Returns409AndNothingChanges() throws Exception {
        Admin current = createAdmin("super-a@khu.ac.kr", AdminRole.SUPER_ADMIN);
        Admin otherSuper = createAdmin("super-b@khu.ac.kr", AdminRole.SUPER_ADMIN);
        authenticateAs(current);

        mockMvc.perform(post("/api/admin/admins/{id}/handover", otherSuper.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("HANDOVER_TARGET_NOT_ADMIN"));

        assertThat(adminRepository.findById(current.getId()).orElseThrow().getRole()).isEqualTo(AdminRole.SUPER_ADMIN);
        assertThat(adminRepository.findById(otherSuper.getId()).orElseThrow().getRole()).isEqualTo(AdminRole.SUPER_ADMIN);
    }

    @Test
    void handover_TargetNotFound_Returns404() throws Exception {
        Admin current = createAdmin("super-only@khu.ac.kr", AdminRole.SUPER_ADMIN);
        authenticateAs(current);

        mockMvc.perform(post("/api/admin/admins/{id}/handover", 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockAdminUser(role = "ADMIN")
    void handover_CalledByRegularAdmin_Returns403() throws Exception {
        Admin target = createAdmin("target@khu.ac.kr", AdminRole.ADMIN);

        mockMvc.perform(post("/api/admin/admins/{id}/handover", target.getId()))
                .andExpect(status().isForbidden());
    }
}
