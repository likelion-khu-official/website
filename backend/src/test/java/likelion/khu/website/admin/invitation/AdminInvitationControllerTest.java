package likelion.khu.website.admin.invitation;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.email.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AdminInvitationControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired AdminRepository adminRepository;
    @Autowired AdminInvitationRepository invitationRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @MockitoBean
    EmailService emailService;

    @Test
    @WithMockAdminUser(email = "super@khu.ac.kr", role = "SUPER_ADMIN")
    void invite_ValidKhuEmail_Returns201AndSendsInviteEmail() throws Exception {
        mockMvc.perform(post("/api/admin/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new-admin@khu.ac.kr\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new-admin@khu.ac.kr"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.invitedBy").value("super@khu.ac.kr"));

        verify(emailService, times(1)).sendInviteEmail(anyString(), anyString(), any(LocalDateTime.class));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void invite_NonKhuEmail_Returns400() throws Exception {
        mockMvc.perform(post("/api/admin/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"someone@example.com\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EMAIL_DOMAIN"));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void invite_AlreadyRegisteredEmail_Returns409() throws Exception {
        adminRepository.save(
                Admin.register("existing@khu.ac.kr", "이름", passwordEncoder.encode("password1"), AdminRole.ADMIN));

        mockMvc.perform(post("/api/admin/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"existing@khu.ac.kr\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_MEMBER"));
    }

    @Test
    @WithMockAdminUser(role = "ADMIN")
    void invite_CalledByRegularAdmin_Returns403() throws Exception {
        mockMvc.perform(post("/api/admin/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new-admin@khu.ac.kr\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void list_ReturnsInvitations() throws Exception {
        invitationRepository.save(
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token-a", Duration.ofHours(72)));

        mockMvc.perform(get("/api/admin/invitations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("a@khu.ac.kr"));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void cancel_PendingInvitation_Succeeds() throws Exception {
        AdminInvitation invitation = invitationRepository.save(
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token-b", Duration.ofHours(72)));

        mockMvc.perform(delete("/api/admin/invitations/{id}", invitation.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void cancel_UnknownId_Returns404() throws Exception {
        mockMvc.perform(delete("/api/admin/invitations/{id}", 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    void verify_PendingToken_ReturnsEmail() throws Exception {
        invitationRepository.save(
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token-c", Duration.ofHours(72)));

        mockMvc.perform(get("/api/admin/invitations/{token}/verify", "token-c"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("a@khu.ac.kr"));
    }

    @Test
    void verify_ExpiredToken_Returns410() throws Exception {
        invitationRepository.save(
                AdminInvitation.issue("a@khu.ac.kr", "super@khu.ac.kr", "token-d", Duration.ofMillis(-1)));

        mockMvc.perform(get("/api/admin/invitations/{token}/verify", "token-d"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("EXPIRED_TOKEN"));
    }

    @Test
    void verify_UnknownToken_Returns400() throws Exception {
        mockMvc.perform(get("/api/admin/invitations/{token}/verify", "no-such-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test
    void accept_ValidToken_CreatesAdminAndAllowsLogin() throws Exception {
        invitationRepository.save(
                AdminInvitation.issue("new@khu.ac.kr", "super@khu.ac.kr", "token-e", Duration.ofHours(72)));

        mockMvc.perform(post("/api/admin/invitations/{token}/accept", "token-e")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"새운영진\",\"password\":\"password1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new@khu.ac.kr"))
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new@khu.ac.kr\",\"password\":\"password1\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void accept_WeakPassword_Returns400() throws Exception {
        invitationRepository.save(
                AdminInvitation.issue("new2@khu.ac.kr", "super@khu.ac.kr", "token-f", Duration.ofHours(72)));

        mockMvc.perform(post("/api/admin/invitations/{token}/accept", "token-f")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"새운영진\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("WEAK_PASSWORD"));
    }

    @Test
    void accept_AlreadyAcceptedToken_Returns400() throws Exception {
        invitationRepository.save(
                AdminInvitation.issue("new3@khu.ac.kr", "super@khu.ac.kr", "token-g", Duration.ofHours(72)));
        mockMvc.perform(post("/api/admin/invitations/{token}/accept", "token-g")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"새운영진\",\"password\":\"password1\"}"));

        mockMvc.perform(post("/api/admin/invitations/{token}/accept", "token-g")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"또다른이름\",\"password\":\"password2\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }
}
