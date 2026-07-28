package likelion.khu.website.recruitment;

import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.email.EmailService;
import likelion.khu.website.notification.NotificationSubscription;
import likelion.khu.website.notification.NotificationSubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// #154 결정(B) — 지원폼(#152)이 준비되지 않은 환경(application-form-ready=false, 운영 기본값)에서는
// 모집 열기 자체가 막혀야 한다. 나머지 상태 전이(RecruitmentManagementControllerTest)는 테스트
// 기본 설정(true, 검증 환경 가정)으로 그대로 두고, 이 클래스만 별도로 false를 오버라이드해 확인한다.
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
@TestPropertySource(properties = "app.recruitment.application-form-ready=false")
class RecruitmentManagementControllerProductionHoldTest {

    @Autowired MockMvc mockMvc;
    @Autowired NotificationSubscriptionRepository subscriptionRepository;

    @MockitoBean
    EmailService emailService;

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_ApplicationFormNotReady_Returns409AndDoesNotSend() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));

        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RECRUITMENT_PRODUCTION_HOLD"));

        verify(emailService, never()).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    // 여는 것만 막힌다 — 닫기는 이 스위치와 무관하게 항상 동작해야 실수로 열린 모집을
    // 되돌릴 방법이 막히는 사고를 피한다.
    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void close_ApplicationFormNotReady_StillWorks() throws Exception {
        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false));
    }
}
