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
class SectionReachAnalyticsIntegrationTest {

    private static final String VISITOR_ID = "018f47a3-7b2d-4c11-8b69-0a3b7f9c2d10";
    private static final String VISIT_A = "228f47a3-7b2d-4c11-8b69-0a3b7f9c2d12";
    private static final String VISIT_B = "328f47a3-7b2d-4c11-8b69-0a3b7f9c2d13";
    private static final String BROWSER_USER_AGENT = "Mozilla/5.0 Chrome/126 Safari/537.36";

    @Autowired MockMvc mockMvc;
    @Autowired AnalyticsEventRepository repository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void repeatedScrollInOneVisitIsDeduplicatedAndUnreachedSectionsStayZero() throws Exception {
        track("PROJECT", VISIT_A, "likelion-khu.com");
        track("PROJECT", VISIT_A, "likelion-khu.com");
        track("STAFF", VISIT_A, "likelion-khu.com");
        track("PROJECT", VISIT_B, "likelion-khu.com");
        track("BLOG", VISIT_B, "dev.likelion-khu.com");

        assertThat(repository.findAll()).hasSize(3);
        assertThat(repository.findAll())
                .allSatisfy(event -> {
                    assertThat(event.getVisitKey()).hasSize(64).isNotIn(VISIT_A, VISIT_B);
                    assertThat(event.getDeduplicationKey()).hasSize(64);
                    assertThat(event.getVisitorKey()).hasSize(64).isNotEqualTo(VISITOR_ID);
                });

        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/sections")
                        .param("from", today.toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[0].section").value("PROJECT"))
                .andExpect(jsonPath("$.sections[0].reaches").value(2))
                .andExpect(jsonPath("$.sections[1].section").value("STAFF"))
                .andExpect(jsonPath("$.sections[1].reaches").value(1))
                .andExpect(jsonPath("$.sections[2].section").value("BLOG"))
                .andExpect(jsonPath("$.sections[2].reaches").value(0))
                .andExpect(jsonPath("$.sections[3].section").value("RECRUIT"))
                .andExpect(jsonPath("$.sections[3].reaches").value(0));

        mockMvc.perform(get("/api/admin/analytics/sections")
                        .param("from", today.minusDays(2).toString())
                        .param("to", today.minusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[0].reaches").value(0))
                .andExpect(jsonPath("$.sections[1].reaches").value(0));
    }

    @Test
    void unknownSectionIsRejectedAndAdminApiRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/analytics/events")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("FOOTER", VISIT_A)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/admin/analytics/sections")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-02"))
                .andExpect(status().isUnauthorized());
    }

    private void track(String section, String visitId, String host) throws Exception {
        mockMvc.perform(post("/api/analytics/events")
                        .header("Host", host)
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(section, visitId)))
                .andExpect(status().isNoContent());
    }

    private String body(String section, String visitId) {
        return "{\"event\":\"SECTION_REACH\",\"key\":\"" + section
                + "\",\"visitorId\":\"" + VISITOR_ID + "\",\"visitId\":\"" + visitId + "\"}";
    }
}
