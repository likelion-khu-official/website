package likelion.khu.website.analytics;

import likelion.khu.website.project.Project;
import likelion.khu.website.project.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectAnalyticsIntegrationTest {

    private static final String BROWSER_USER_AGENT = "Mozilla/5.0 Chrome/126 Safari/537.36";

    @Autowired MockMvc mockMvc;
    @Autowired ProjectRepository projectRepository;
    @Autowired AnalyticsPageViewRepository pageViewRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void viewsStayWithStableProjectIdAfterEditingAndHiding() throws Exception {
        Project first = projectRepository.saveAndFlush(Project.create(
                "첫 프로젝트", "소개", 14, Set.of("Spring"), null, null, null));
        Project second = projectRepository.saveAndFlush(Project.create(
                "두 번째 프로젝트", "소개", 13, Set.of("Next.js"), null, null, null));

        track(first.getId());
        track(first.getId());
        track(second.getId());

        first.update("이름을 바꾼 프로젝트", "바뀐 소개", null, null, null, null);
        projectRepository.saveAndFlush(first);
        track(first.getId());
        first.setHidden(true);
        projectRepository.saveAndFlush(first);

        assertThat(pageViewRepository.findAll())
                .filteredOn(view -> first.getId().equals(view.getContentId()))
                .hasSize(3)
                .allMatch(view -> view.getContentType() == AnalyticsContentType.PROJECT);

        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/projects")
                        .param("from", today.minusDays(6).toString())
                        .param("to", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(4))
                .andExpect(jsonPath("$.projects[0].id").value(first.getId()))
                .andExpect(jsonPath("$.projects[0].title").value("이름을 바꾼 프로젝트"))
                .andExpect(jsonPath("$.projects[0].cohort").value(14))
                .andExpect(jsonPath("$.projects[0].hidden").value(true))
                .andExpect(jsonPath("$.projects[0].views").value(3))
                .andExpect(jsonPath("$.projects[1].id").value(second.getId()))
                .andExpect(jsonPath("$.projects[1].views").value(1));

        mockMvc.perform(get("/api/admin/analytics/projects")
                        .param("from", today.minusDays(6).toString())
                        .param("to", today.toString())
                        .param("projectId", first.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(3))
                .andExpect(jsonPath("$.series[6].views").value(3));
    }

    @Test
    void oversizedNumericPathIsCollectedWithoutBreakingThePublicEndpoint() throws Exception {
        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"/projects/999999999999999999999999999999\"}"))
                .andExpect(status().isNoContent());

        assertThat(pageViewRepository.findAll())
                .singleElement()
                .satisfies(view -> {
                    assertThat(view.getContentType()).isNull();
                    assertThat(view.getContentId()).isNull();
                });
    }

    private void track(long projectId) throws Exception {
        mockMvc.perform(post("/api/analytics/pageviews")
                        .header("Host", "likelion-khu.com")
                        .header("User-Agent", BROWSER_USER_AGENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"path\":\"/projects/" + projectId + "\"}"))
                .andExpect(status().isNoContent());
    }
}
