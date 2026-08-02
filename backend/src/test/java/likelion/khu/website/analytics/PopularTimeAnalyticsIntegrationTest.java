package likelion.khu.website.analytics;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PopularTimeAnalyticsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired AnalyticsPageViewRepository repository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void kstHourAndWeekdayAreCountedAcrossTheUtcDateBoundary() throws Exception {
        LocalDateTime monday0030 = Instant.parse("2026-08-02T15:30:00Z")
                .atZone(AnalyticsPageViewService.ANALYTICS_ZONE).toLocalDateTime();
        LocalDateTime monday2030 = Instant.parse("2026-08-03T11:30:00Z")
                .atZone(AnalyticsPageViewService.ANALYTICS_ZONE).toLocalDateTime();
        LocalDateTime tuesday2030 = Instant.parse("2026-08-04T11:30:00Z")
                .atZone(AnalyticsPageViewService.ANALYTICS_ZONE).toLocalDateTime();
        repository.save(new AnalyticsPageView("/", monday0030));
        repository.save(new AnalyticsPageView("/blog", monday2030));
        repository.save(new AnalyticsPageView("/projects", tuesday2030));

        assertThat(monday0030.toLocalDate()).isEqualTo(LocalDate.of(2026, 8, 3));
        mockMvc.perform(get("/api/admin/analytics/popular-times")
                        .param("from", "2026-08-03")
                        .param("to", "2026-08-04"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.range.timezone").value("Asia/Seoul"))
                .andExpect(jsonPath("$.totalViews").value(3))
                .andExpect(jsonPath("$.hours.length()").value(24))
                .andExpect(jsonPath("$.hours[0].views").value(1))
                .andExpect(jsonPath("$.hours[20].views").value(2))
                .andExpect(jsonPath("$.weekdays.length()").value(7))
                .andExpect(jsonPath("$.weekdays[0].day").value("MONDAY"))
                .andExpect(jsonPath("$.weekdays[0].views").value(2))
                .andExpect(jsonPath("$.weekdays[1].day").value("TUESDAY"))
                .andExpect(jsonPath("$.weekdays[1].views").value(1));

        mockMvc.perform(get("/api/admin/analytics/popular-times")
                        .param("from", "2026-08-02")
                        .param("to", "2026-08-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(0));
    }

    @Test
    void endpointRequiresAdministrator() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/popular-times")
                        .param("from", "2026-08-03")
                        .param("to", "2026-08-04"))
                .andExpect(status().isUnauthorized());
    }
}
