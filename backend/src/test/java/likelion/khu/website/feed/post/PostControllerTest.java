package likelion.khu.website.feed.post;

import likelion.khu.website.feed.MagicLinkToken;
import likelion.khu.website.feed.MagicLinkTokenRepository;
import likelion.khu.website.feed.MagicLinkTokenService;
import likelion.khu.website.feed.dto.MagicLinkTokenIssueRequest;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PostControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired MagicLinkTokenService magicLinkTokenService;
    @Autowired MagicLinkTokenRepository tokenRepository;
    @Autowired PostService postService;

    private String issueToken() {
        return magicLinkTokenService.issue(new MagicLinkTokenIssueRequest("시현")).getToken();
    }

    private Long createPublishedPost(String token) throws Exception {
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("본문");
        PostDetailResponse res = postService.createPost(token, req);
        postService.updateStatus(res.getId(), PostStatus.PUBLISHED);
        return res.getId();
    }

    @Test
    void createPost_ValidRequest_Returns201() throws Exception {
        String token = issueToken();

        mockMvc.perform(post("/api/posts")
                        .header("X-Magic-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"제목\",\"content\":\"본문\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.authorName").value("시현"))
                .andExpect(jsonPath("$.slug").isNotEmpty());
    }

    @Test
    void createPost_MissingTokenHeader_Returns400() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"제목\",\"content\":\"본문\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPost_UsedToken_Returns410() throws Exception {
        String token = issueToken();
        mockMvc.perform(post("/api/posts")
                .header("X-Magic-Token", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"제목\",\"content\":\"본문\"}"));

        mockMvc.perform(post("/api/posts")
                        .header("X-Magic-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"두 번째\",\"content\":\"본문\"}"))
                .andExpect(status().isGone());
    }

    @Test
    void createPost_BlankTitle_Returns400() throws Exception {
        String token = issueToken();

        mockMvc.perform(post("/api/posts")
                        .header("X-Magic-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"content\":\"본문\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listPosts_ReturnsOnlyPublished() throws Exception {
        String t1 = issueToken();
        String t2 = magicLinkTokenService.issue(new MagicLinkTokenIssueRequest("선우")).getToken();
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("초안");
        req.setContent("내용");
        postService.createPost(t1, req);           // draft — 목록에 안 나옴
        createPublishedPost(t2);                   // published — 목록에 나옴

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void getPost_PublishedPost_Returns200() throws Exception {
        String token = issueToken();
        Long id = createPublishedPost(token);
        String slug = postService.getAdminPosts(org.springframework.data.domain.PageRequest.of(0, 1))
                .getContent().get(0).getSlug();

        mockMvc.perform(get("/api/posts/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("본문"));
    }

    @Test
    void getPost_DraftSlug_Returns404() throws Exception {
        String token = issueToken();
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("초안");
        req.setContent("내용");
        PostDetailResponse draft = postService.createPost(token, req);

        mockMvc.perform(get("/api/posts/{slug}", draft.getSlug()))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateStatus_DraftToPublished_Returns200() throws Exception {
        String token = issueToken();
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("내용");
        Long id = postService.createPost(token, req).getId();

        mockMvc.perform(patch("/api/admin/posts/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.publishedAt").isNotEmpty());
    }

    @Test
    void updateStatus_InvalidTransition_Returns400() throws Exception {
        String token = issueToken();
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("내용");
        Long id = postService.createPost(token, req).getId();

        mockMvc.perform(patch("/api/admin/posts/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"HIDDEN\"}"))
                .andExpect(status().isBadRequest());
    }
}
