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
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VisitorAnalyticsIntegrationTest {

    private static final String VISITOR_A = "018f47a3-7b2d-4c11-8b69-0a3b7f9c2d10";
    private static final String VISITOR_B = "128f47a3-7b2d-4c11-8b69-0a3b7f9c2d11";
    private static final String BROWSER_USER_AGENT = "Mozilla/5.0 Chrome/126 Safari/537.36";

    @Autowired MockMvc mockMvc;
    @Autowired AnalyticsPageViewRepository repository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void repeatedViewsBecomeOneAnonymousVisitorAndPeriodBoundaryChangesTheTotal() throws Exception {
        track("/projects", VISITOR_A);
        track("/projects", VISITOR_A);
        track("/blog", VISITOR_A);
        track("/blog", VISITOR_B);

        assertThat(repository.findAll())
                .hasSize(4)
                .allSatisfy(view -> {
                    assertThat(view.getVisitorKey()).hasSize(64);
                    assertThat(view.getVisitorKey()).isNotIn(VISITOR_A, VISITOR_B);
                });
        String visitorAKey = repository.findAll().get(0).getVisitorKey();
        repository.save(new AnalyticsPageView(
                "/", LocalDateTime.now(AnalyticsPageViewService.ANALYTICS_ZONE).minusDays(1),
                null, null, "older-anonymous-key"));

        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/visitors")
                        .param("from", today.toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uniqueVisitors").value(2))
                .andExpect(jsonPath("$.series[0].visitors").value(2));

        mockMvc.perform(get("/api/admin/analytics/visitors")
                        .param("from", today.minusDays(1).toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uniqueVisitors").value(3))
                .andExpect(jsonPath("$.series[0].visitors").value(1))
                .andExpect(jsonPath("$.series[1].visitors").value(2));

        mockMvc.perform(get("/api/admin/analytics/visitors")
                        .param("from", today.toString())
                        .param("to", today.toString())
                        .param("page", "/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uniqueVisitors").value(1));

        assertThat(repository.findAll().stream()
                .filter(view -> visitorAKey.equals(view.getVisitorKey())))
                .hasSize(3);
    }

    @Test
    void malformedVisitorIdIsRejectedAndAnalyticsRequiresAdmin() throws Exception {
        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"/\",\"visitorId\":\"email@example.com\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/admin/analytics/visitors")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-02"))
                .andExpect(status().isUnauthorized());
        assertThat(repository.count()).isZero();
    }

    private void track(String path, String visitorId) throws Exception {
        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"" + path + "\",\"visitorId\":\"" + visitorId + "\"}"))
                .andExpect(status().isNoContent());
    }
}
