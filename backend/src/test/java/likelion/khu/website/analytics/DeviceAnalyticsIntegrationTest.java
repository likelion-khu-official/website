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
class DeviceAnalyticsIntegrationTest {

    private static final String MOBILE_USER_AGENT =
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari/604.1";
    private static final String DESKTOP_USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126 Safari/537.36";

    @Autowired MockMvc mockMvc;
    @Autowired AnalyticsPageViewRepository repository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void mobileDesktopAndUnknownViewsAreAllClassifiedAndTotalOneHundredPercent() throws Exception {
        track(MOBILE_USER_AGENT);
        track(MOBILE_USER_AGENT);
        track(DESKTOP_USER_AGENT);
        track("CustomReader/1.0");

        assertThat(repository.findAll())
                .extracting(AnalyticsPageView::getDeviceType)
                .containsExactly(
                        AnalyticsDeviceType.MOBILE,
                        AnalyticsDeviceType.MOBILE,
                        AnalyticsDeviceType.DESKTOP,
                        AnalyticsDeviceType.OTHER);

        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/devices")
                        .param("from", today.toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(4))
                .andExpect(jsonPath("$.devices[0].device").value("MOBILE"))
                .andExpect(jsonPath("$.devices[0].views").value(2))
                .andExpect(jsonPath("$.devices[0].percentage").value(50.0))
                .andExpect(jsonPath("$.devices[1].device").value("DESKTOP"))
                .andExpect(jsonPath("$.devices[1].views").value(1))
                .andExpect(jsonPath("$.devices[1].percentage").value(25.0))
                .andExpect(jsonPath("$.devices[2].device").value("OTHER"))
                .andExpect(jsonPath("$.devices[2].views").value(1))
                .andExpect(jsonPath("$.devices[2].percentage").value(25.0));

        mockMvc.perform(get("/api/admin/analytics/devices")
                        .param("from", today.minusDays(2).toString())
                        .param("to", today.minusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(0))
                .andExpect(jsonPath("$.devices[0].views").value(0))
                .andExpect(jsonPath("$.devices[1].views").value(0))
                .andExpect(jsonPath("$.devices[2].views").value(0));
    }

    @Test
    void deviceAnalyticsRequiresAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/devices")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-02"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void displayedOneDecimalPercentagesStillAddUpToOneHundred() throws Exception {
        track(MOBILE_USER_AGENT);
        track(DESKTOP_USER_AGENT);
        track("CustomReader/1.0");

        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/devices")
                        .param("from", today.toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.devices[0].percentage").value(33.4))
                .andExpect(jsonPath("$.devices[1].percentage").value(33.3))
                .andExpect(jsonPath("$.devices[2].percentage").value(33.3));
    }

    private void track(String userAgent) throws Exception {
        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", userAgent)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"/\"}"))
                .andExpect(status().isNoContent());
    }
}
