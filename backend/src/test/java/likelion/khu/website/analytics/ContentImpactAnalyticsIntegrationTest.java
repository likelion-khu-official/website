package likelion.khu.website.analytics;

import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostRepository;
import likelion.khu.website.project.Project;
import likelion.khu.website.project.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ContentImpactAnalyticsIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired PostRepository postRepository;
    @Autowired ProjectRepository projectRepository;
    @Autowired AnalyticsPageViewRepository pageViewRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void publicationMarkerAndEqualSevenDayWindowsUseStableContentIdentity() throws Exception {
        LocalDate publishedDate = LocalDate.of(2026, 7, 20);
        Post post = Post.create("first-slug", "처음 제목", "요약", "본문", "작성자", List.of("BE"), null, null);
        ReflectionTestUtils.setField(post, "publishedAt", publishedDate.atTime(10, 0));
        ReflectionTestUtils.setField(post, "createdAt", publishedDate.minusDays(2).atTime(9, 0));
        postRepository.save(post);
        post.replace("바뀐 제목", "요약", "본문", null);
        postRepository.flush();

        pageViewRepository.save(new AnalyticsPageView("/", publishedDate.minusDays(1).atTime(9, 0)));
        pageViewRepository.save(new AnalyticsPageView("/projects", publishedDate.minusDays(1).atTime(10, 0)));
        pageViewRepository.save(new AnalyticsPageView("/", publishedDate.atTime(8, 0)));
        pageViewRepository.save(new AnalyticsPageView("/blog/first-slug", publishedDate.atTime(9, 0),
                AnalyticsContentType.BLOG_POST, post.getId()));
        pageViewRepository.save(new AnalyticsPageView("/blog/first-slug", publishedDate.plusDays(1).atTime(9, 0),
                AnalyticsContentType.BLOG_POST, post.getId()));
        pageViewRepository.save(new AnalyticsPageView("/blog/first-slug", publishedDate.plusDays(2).atTime(9, 0),
                AnalyticsContentType.BLOG_POST, post.getId()));
        pageViewRepository.save(new AnalyticsPageView("/projects", publishedDate.plusDays(2).atTime(10, 0)));

        mockMvc.perform(get("/api/admin/analytics/content-impact")
                        .param("from", "2026-07-01")
                        .param("to", "2026-07-31")
                        .param("type", "BLOG_POST")
                        .param("id", post.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comparison.content.title").value("바뀐 제목"))
                .andExpect(jsonPath("$.comparison.content.publishedAt").value("2026-07-20T10:00:00"))
                .andExpect(jsonPath("$.comparison.comparisonDays").value(7))
                .andExpect(jsonPath("$.comparison.complete").value(true))
                .andExpect(jsonPath("$.comparison.before.from").value("2026-07-13"))
                .andExpect(jsonPath("$.comparison.before.to").value("2026-07-19"))
                .andExpect(jsonPath("$.comparison.before.siteViews").value(2))
                .andExpect(jsonPath("$.comparison.after.from").value("2026-07-20"))
                .andExpect(jsonPath("$.comparison.after.to").value("2026-07-26"))
                .andExpect(jsonPath("$.comparison.after.siteViews").value(5))
                .andExpect(jsonPath("$.comparison.contentViewsAfter").value(3))
                .andExpect(jsonPath("$.comparison.series.length()").value(14))
                .andExpect(jsonPath("$.comparison.series[7].date").value("2026-07-20"));

        assertThat(post.getPublishedAt()).isEqualTo(LocalDateTime.of(2026, 7, 20, 10, 0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void recentProjectUsesEqualElapsedWindowsAndIsClearlyIncomplete() throws Exception {
        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        LocalDate publishedDate = today.minusDays(1);
        Project project = Project.create("새 프로젝트", "요약", 15, Set.of("Java"), null, today, null);
        ReflectionTestUtils.setField(project, "createdAt", publishedDate.atTime(11, 0));
        projectRepository.saveAndFlush(project);
        pageViewRepository.save(new AnalyticsPageView("/", publishedDate.minusDays(1).atTime(9, 0)));
        pageViewRepository.save(new AnalyticsPageView("/projects/" + project.getId(), publishedDate.atTime(12, 0),
                AnalyticsContentType.PROJECT, project.getId()));

        mockMvc.perform(get("/api/admin/analytics/content-impact")
                        .param("from", today.minusDays(10).toString())
                        .param("to", today.toString())
                        .param("type", "PROJECT")
                        .param("id", project.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comparison.comparisonDays").value(2))
                .andExpect(jsonPath("$.comparison.complete").value(false))
                .andExpect(jsonPath("$.comparison.before.siteViews").value(1))
                .andExpect(jsonPath("$.comparison.after.siteViews").value(1))
                .andExpect(jsonPath("$.comparison.contentViewsAfter").value(1))
                .andExpect(jsonPath("$.comparison.series.length()").value(4));
    }

    @Test
    void endpointRequiresAdministrator() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/content-impact")
                        .param("from", "2026-07-01")
                        .param("to", "2026-07-31"))
                .andExpect(status().isUnauthorized());
    }
}
