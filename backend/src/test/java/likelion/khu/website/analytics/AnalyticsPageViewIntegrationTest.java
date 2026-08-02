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
class AnalyticsPageViewIntegrationTest {

    private static final String BROWSER_USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36";

    @Autowired MockMvc mockMvc;
    @Autowired AnalyticsPageViewRepository repository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void publicViewsAccumulateInDatabaseAndAppearInAdminAggregation() throws Exception {
        track("/projects/");
        track("/projects");
        track("/blog");

        assertThat(repository.count()).isEqualTo(3);

        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/pageviews")
                        .param("from", today.minusDays(6).toString())
                        .param("to", today.toString())
                        .param("interval", "day"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.range.timezone").value("Asia/Seoul"))
                .andExpect(jsonPath("$.range.interval").value("day"))
                .andExpect(jsonPath("$.totalViews").value(3))
                .andExpect(jsonPath("$.series.length()").value(7))
                .andExpect(jsonPath("$.series[6].date").value(today.toString()))
                .andExpect(jsonPath("$.series[6].views").value(3))
                .andExpect(jsonPath("$.pages[0].path").value("/projects"))
                .andExpect(jsonPath("$.pages[0].views").value(2))
                .andExpect(jsonPath("$.pages[1].path").value("/blog"))
                .andExpect(jsonPath("$.pages[1].views").value(1));

        mockMvc.perform(get("/api/admin/analytics/pageviews")
                        .param("from", today.minusDays(6).toString())
                        .param("to", today.toString())
                        .param("page", "/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(2))
                // 그래프만 선택 페이지로 좁히고 비교용 페이지 표는 전체를 유지한다.
                .andExpect(jsonPath("$.pages.length()").value(2));

        mockMvc.perform(get("/api/admin/analytics/pageviews")
                        .param("from", today.minusDays(2).toString())
                        .param("to", today.minusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(0))
                .andExpect(jsonPath("$.series[0].views").value(0))
                .andExpect(jsonPath("$.series[1].views").value(0));
    }

    @Test
    void nonProductionInternalAndBotViewsReturnNormallyButAreNotStored() throws Exception {
        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "dev.likelion-khu.com")
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"/projects\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"/admin/analytics\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", "Googlebot/2.1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"/blog\"}"))
                .andExpect(status().isNoContent());

        assertThat(repository.count()).isZero();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void aggregationFillsEmptyBucketsAndUsesKstMondayAndMonthBoundaries() throws Exception {
        repository.save(new AnalyticsPageView("/", LocalDateTime.of(2026, 7, 31, 23, 59)));
        repository.save(new AnalyticsPageView("/", LocalDateTime.of(2026, 8, 3, 0, 0)));
        repository.save(new AnalyticsPageView("/blog", LocalDateTime.of(2026, 8, 9, 12, 0)));

        mockMvc.perform(get("/api/admin/analytics/pageviews")
                        .param("from", "2026-07-27")
                        .param("to", "2026-08-09")
                        .param("interval", "week"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.series[0].date").value("2026-07-27"))
                .andExpect(jsonPath("$.series[0].views").value(1))
                .andExpect(jsonPath("$.series[1].date").value("2026-08-03"))
                .andExpect(jsonPath("$.series[1].views").value(2));

        mockMvc.perform(get("/api/admin/analytics/pageviews")
                        .param("from", "2026-07-01")
                        .param("to", "2026-09-30")
                        .param("interval", "month"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.series[0].views").value(1))
                .andExpect(jsonPath("$.series[1].views").value(2))
                .andExpect(jsonPath("$.series[2].views").value(0));
    }

    @Test
    void adminAggregationRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/pageviews")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-02"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    private void track(String path) throws Exception {
        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"" + path + "\"}"))
                .andExpect(status().isNoContent());
    }
}

