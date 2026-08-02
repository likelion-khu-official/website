package likelion.khu.website.analytics;

import likelion.khu.website.notification.NotificationSubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationSignupAnalyticsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired NotificationSubscriptionRepository repository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void onlyNewDatabaseSubscriptionsIncreaseTheSelectedPeriodAndNoEmailIsExposed() throws Exception {
        subscribe("first@example.com", "");
        subscribe("first@example.com", "");
        subscribe("second@example.com", "");
        subscribe("bot@example.com", "filled-by-bot");

        assertThat(repository.count()).isEqualTo(2);
        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/notification-signups")
                        .param("from", today.toString())
                        .param("to", today.toString())
                        .param("interval", "day"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSignups").value(2))
                .andExpect(jsonPath("$.series[0].date").value(today.toString()))
                .andExpect(jsonPath("$.series[0].signups").value(2))
                .andExpect(content().string(not(containsString("first@example.com"))))
                .andExpect(content().string(not(containsString("second@example.com"))));

        mockMvc.perform(get("/api/admin/analytics/notification-signups")
                        .param("from", today.minusDays(2).toString())
                        .param("to", today.minusDays(1).toString())
                        .param("interval", "day"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSignups").value(0))
                .andExpect(jsonPath("$.series[0].signups").value(0))
                .andExpect(jsonPath("$.series[1].signups").value(0));
    }

    @Test
    void analyticsEndpointRequiresAdministrator() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/notification-signups")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-02"))
                .andExpect(status().isUnauthorized());
    }

    private void subscribe(String email, String website) throws Exception {
        mockMvc.perform(post("/api/notifications/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"privacyConsent\":true,\"website\":\""
                                + website + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
