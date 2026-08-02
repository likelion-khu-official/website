package likelion.khu.website.analytics;

import jakarta.persistence.EntityManager;
import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BlogAnalyticsIntegrationTest {

    private static final String BROWSER_USER_AGENT = "Mozilla/5.0 Chrome/126 Safari/537.36";

    @Autowired MockMvc mockMvc;
    @Autowired PostRepository postRepository;
    @Autowired AnalyticsPageViewRepository pageViewRepository;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired EntityManager entityManager;

    @Test
    @WithMockUser(roles = "ADMIN")
    void viewsStayWithStablePostIdAcrossTitleSlugAndVisibilityChanges() throws Exception {
        Post first = postRepository.saveAndFlush(Post.create(
                "first-story", "첫 번째 이야기", "요약", "본문", "운영진", List.of("BE"), null, null));
        Post second = postRepository.saveAndFlush(Post.create(
                "second-story", "두 번째 이야기", "요약", "본문", "운영진", List.of("FE"), null, null));

        track("/blog/first-story");
        track("/blog/first-story");
        track("/blog/second-story");

        // 같은 글의 주소와 제목이 바뀐 상황을 DB 경계에서 재현한다. 과거 행은 path가 아니라 content_id로 이어져야 한다.
        entityManager.flush();
        jdbcTemplate.update("update posts set slug = ?, title = ? where id = ?",
                "renamed-story", "이름을 바꾼 이야기", first.getId());
        entityManager.clear();
        track("/blog/renamed-story");

        jdbcTemplate.update("update posts set status = 'HIDDEN' where id = ?", first.getId());
        entityManager.clear();

        assertThat(pageViewRepository.findAll())
                .filteredOn(view -> first.getId().equals(view.getContentId()))
                .hasSize(3)
                .allMatch(view -> view.getContentType() == AnalyticsContentType.BLOG_POST);

        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        mockMvc.perform(get("/api/admin/analytics/blog-posts")
                        .param("from", today.minusDays(6).toString())
                        .param("to", today.toString())
                        .param("interval", "day"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(4))
                .andExpect(jsonPath("$.posts[0].id").value(first.getId()))
                .andExpect(jsonPath("$.posts[0].slug").value("renamed-story"))
                .andExpect(jsonPath("$.posts[0].title").value("이름을 바꾼 이야기"))
                .andExpect(jsonPath("$.posts[0].status").value("HIDDEN"))
                .andExpect(jsonPath("$.posts[0].views").value(3))
                .andExpect(jsonPath("$.posts[1].id").value(second.getId()))
                .andExpect(jsonPath("$.posts[1].views").value(1));

        mockMvc.perform(get("/api/admin/analytics/blog-posts")
                        .param("from", today.minusDays(6).toString())
                        .param("to", today.toString())
                        .param("postId", first.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalViews").value(3))
                .andExpect(jsonPath("$.series[6].views").value(3));
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

