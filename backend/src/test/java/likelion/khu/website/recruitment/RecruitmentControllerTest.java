package likelion.khu.website.recruitment;

import likelion.khu.website.admin.WithMockAdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class RecruitmentControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired RecruitmentManagementService managementService;

    @MockitoBean
    likelion.khu.website.email.EmailService emailService;

    // 공개 엔드포인트 — 비인증으로도 열려야 한다(#151, 랜딩·/recruit 페이지용).

    @Test
    void status_Unauthenticated_ReturnsOpenFalseByDefault() throws Exception {
        mockMvc.perform(get("/api/recruitment/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false));
    }

    @Test
    void status_DoesNotExposeSubscriberCount() throws Exception {
        mockMvc.perform(get("/api/recruitment/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subscriberCount").doesNotExist());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void status_AfterOpen_ReturnsOpenTrue() throws Exception {
        managementService.open();

        mockMvc.perform(get("/api/recruitment/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true));
    }
}
