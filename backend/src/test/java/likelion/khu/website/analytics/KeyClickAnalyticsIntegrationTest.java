package likelion.khu.website.analytics;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class KeyClickAnalyticsIntegrationTest {

    private static final String VISITOR_ID = "018f47a3-7b2d-4c11-8b69-0a3b7f9c2d10";
    private static final String VISIT_ID = "428f47a3-7b2d-4c11-8b69-0a3b7f9c2d14";
    private static final String USER_AGENT = "Mozilla/5.0 Chrome/126 Safari/537.36";

    @Autowired MockMvc mockMvc;
    @Autowired AnalyticsEventRepository repository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void everyExplicitClickIsStoredAndActionLocationFiltersUpdateTotalsAndSeries() throws Exception {
        click("APPLY_LANDING_RECRUIT", 2);
        click("APPLY_APPLICATION_FORM", 1);
        click("NOTIFICATION_LANDING_RECRUIT", 1);
        click("BLOG_MORE_LANDING_BLOG", 3);
        click("PROJECT_MORE_LANDING_PROJECT", 1);
        click("PROJECT_GITHUB_PROJECT_DETAIL", 2);

        assertThat(repository.findAll()).hasSize(10);
        assertThat(repository.findAll()).allSatisfy(event -> {
            assertThat(event.getEventType()).isEqualTo(AnalyticsEventType.KEY_CLICK);
            assertThat(event.getDeduplicationKey()).isNull();
            assertThat(event.getVisitKey()).hasSize(64).isNotEqualTo(VISIT_ID);
            assertThat(event.getVisitorKey()).hasSize(64).isNotEqualTo(VISITOR_ID);
        });

        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/clicks")
                        .param("from", today.toString())
                        .param("to", today.toString())
                        .param("interval", "day"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalClicks").value(10))
                .andExpect(jsonPath("$.series[0].clicks").value(10))
                .andExpect(jsonPath("$.clicks[0].action").value("APPLY"))
                .andExpect(jsonPath("$.clicks[0].location").value("LANDING_RECRUIT"))
                .andExpect(jsonPath("$.clicks[0].clicks").value(2))
                .andExpect(jsonPath("$.clicks[1].location").value("APPLICATION_FORM"))
                .andExpect(jsonPath("$.clicks[1].clicks").value(1))
                .andExpect(jsonPath("$.clicks[4].clicks").value(3));

        mockMvc.perform(get("/api/admin/analytics/clicks")
                        .param("from", today.toString())
                        .param("to", today.toString())
                        .param("interval", "day")
                        .param("action", "APPLY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalClicks").value(3))
                .andExpect(jsonPath("$.series[0].clicks").value(3))
                .andExpect(jsonPath("$.clicks.length()").value(2));

        mockMvc.perform(get("/api/admin/analytics/clicks")
                        .param("from", today.minusDays(2).toString())
                        .param("to", today.minusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalClicks").value(0));
    }

    @Test
    void unknownOrMismatchedKeysAreRejectedAndAdminApiIsProtected() throws Exception {
        mockMvc.perform(post("/api/analytics/events")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("ANY_DOM_CLICK", "KEY_CLICK")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/analytics/events")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("PROJECT", "KEY_CLICK")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/admin/analytics/clicks")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-02"))
                .andExpect(status().isUnauthorized());
    }

    private void click(String key, int times) throws Exception {
        for (int count = 0; count < times; count++) {
            mockMvc.perform(post("/api/analytics/events")
                            .header("Host", "likelion-khu.com")
                            .header("User-Agent", USER_AGENT)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(key, "KEY_CLICK")))
                    .andExpect(status().isNoContent());
        }
    }

    private String body(String key, String event) {
        return "{\"event\":\"" + event + "\",\"key\":\"" + key
                + "\",\"visitorId\":\"" + VISITOR_ID + "\",\"visitId\":\"" + VISIT_ID + "\"}";
    }
}
