package likelion.khu.website.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import likelion.khu.website.application.ApplicationService;
import likelion.khu.website.recruitment.RecruitmentManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.recruitment.application-form-ready=true")
@AutoConfigureMockMvc
class RecruitmentAnalyticsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired RecruitmentManagementService recruitmentService;
    @Autowired ApplicationService applicationService;
    @Autowired ObjectMapper objectMapper;

    @Test
    @WithMockUser(roles = "ADMIN")
    void currentCountSurvivesCloseAndNewRoundStartsAtZeroWithoutPii() throws Exception {
        recruitmentService.open();
        long firstRoundId = currentRoundId();
        applicationService.submit(objectMapper.readTree("{\"name\":\"테스트 지원자 A\"}"), true);
        applicationService.submit(objectMapper.readTree("{\"name\":\"테스트 지원자 B\"}"), true);

        String openResponse = mockMvc.perform(get("/api/admin/analytics/recruitment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundId").value(firstRoundId))
                .andExpect(jsonPath("$.state").value("OPEN"))
                .andExpect(jsonPath("$.applicationCount").value(2))
                .andExpect(jsonPath("$.openedAt").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        assertThat(openResponse).doesNotContain("name", "answers", "schema", "테스트 지원자");

        recruitmentService.close();
        mockMvc.perform(get("/api/admin/analytics/recruitment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundId").value(firstRoundId))
                .andExpect(jsonPath("$.state").value("CLOSED"))
                .andExpect(jsonPath("$.applicationCount").value(2))
                .andExpect(jsonPath("$.closedAt").isNotEmpty());

        recruitmentService.open();
        long secondRoundId = currentRoundId();
        assertThat(secondRoundId).isNotEqualTo(firstRoundId);
        mockMvc.perform(get("/api/admin/analytics/recruitment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundId").value(secondRoundId))
                .andExpect(jsonPath("$.state").value("OPEN"))
                .andExpect(jsonPath("$.applicationCount").value(0));

        applicationService.submit(objectMapper.readTree("{\"name\":\"테스트 지원자 C\"}"), true);
        mockMvc.perform(get("/api/admin/analytics/recruitment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundId").value(secondRoundId))
                .andExpect(jsonPath("$.applicationCount").value(1));
    }

    @Test
    void anonymousCannotReadRecruitmentAnalytics() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/recruitment"))
                .andExpect(status().isUnauthorized());
    }

    private long currentRoundId() throws Exception {
        String body = mockMvc.perform(get("/api/admin/analytics/recruitment"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("roundId").asLong();
    }
}
