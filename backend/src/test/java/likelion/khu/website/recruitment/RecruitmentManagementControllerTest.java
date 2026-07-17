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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class RecruitmentManagementControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired NotificationSubscriptionRepository subscriptionRepository;

    @MockitoBean
    EmailService emailService;

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void status_Default_ReturnsClosedWithSubscriberCount() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));
        subscriptionRepository.save(new NotificationSubscription("b@khu.ac.kr"));

        mockMvc.perform(get("/api/admin/recruitment/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false))
                .andExpect(jsonPath("$.subscriberCount").value(2));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_ClosedToOpen_SendsToEverySubscriber() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));
        subscriptionRepository.save(new NotificationSubscription("b@khu.ac.kr"));
        subscriptionRepository.save(new NotificationSubscription("c@khu.ac.kr"));

        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true))
                .andExpect(jsonPath("$.subscriberCount").value(3));

        verify(emailService, times(3)).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    // 완료기준 — "같은 발송을 두 번 트리거해도 중복 발송되지 않는다"
    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void open_AlreadyOpen_DoesNotResend() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));

        mockMvc.perform(patch("/api/admin/recruitment/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"open\":true}"));
        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true));

        verify(emailService, times(1)).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void close_OpenToClosed_DoesNotSendAnything() throws Exception {
        subscriptionRepository.save(new NotificationSubscription("a@khu.ac.kr"));
        mockMvc.perform(patch("/api/admin/recruitment/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"open\":true}"));

        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false));

        // 열 때 1번만 — 닫을 때는 추가로 발송하지 않음
        verify(emailService, times(1)).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    // 닫혀있는 상태에서 close()를 또 호출해도(끄기→끄기) 아무 일도 안 일어나야 함 — 열기 쪽만
    // 멱등성을 요구받았지만, 반대쪽도 부작용 없는지 상태공간 관점에서 확인.
    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void close_AlreadyClosed_NoOp() throws Exception {
        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"open\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false));

        verify(emailService, never()).sendRecruitmentOpenEmail(anyString(), anyString());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void updateStatus_MissingOpenField_Returns400() throws Exception {
        mockMvc.perform(patch("/api/admin/recruitment/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void status_NoCookie_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/recruitment/status"))
                .andExpect(status().isUnauthorized());
    }
}
