package likelion.khu.website.feed.comment;

import likelion.khu.website.feed.MagicLinkTokenService;
import likelion.khu.website.feed.dto.MagicLinkTokenIssueRequest;
import likelion.khu.website.feed.post.PostService;
import likelion.khu.website.feed.post.PostStatus;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class CommentControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired CommentService commentService;
    @Autowired PostService postService;
    @Autowired MagicLinkTokenService magicLinkTokenService;

    private Long createPublishedPost() {
        String token = magicLinkTokenService.issue(new MagicLinkTokenIssueRequest("시현")).getToken();
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("본문");
        PostDetailResponse post = postService.createPost(token, req);
        postService.updateStatus(post.getId(), PostStatus.PUBLISHED);
        return post.getId();
    }

    @Test
    void createComment_ValidRequest_Returns201() throws Exception {
        Long postId = createPublishedPost();

        mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"구경꾼\",\"content\":\"좋은 글!\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname").value("구경꾼"))
                .andExpect(jsonPath("$.content").value("좋은 글!"));
    }

    @Test
    void createComment_NoNickname_Returns201WithNullNickname() throws Exception {
        Long postId = createPublishedPost();

        mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"익명 댓글\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname").doesNotExist());
    }

    @Test
    void createComment_BlankContent_Returns400() throws Exception {
        Long postId = createPublishedPost();

        mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createComment_ContentOver300Chars_Returns400() throws Exception {
        Long postId = createPublishedPost();
        String longContent = "가".repeat(301);

        mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + longContent + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listComments_ReturnsOnlyVisibleComments() throws Exception {
        Long postId = createPublishedPost();
        likelion.khu.website.feed.comment.dto.CommentCreateRequest req =
                new likelion.khu.website.feed.comment.dto.CommentCreateRequest();
        req.setContent("숨길 댓글");
        Long hiddenId = commentService.create(postId, req).getId();
        commentService.hide(hiddenId);

        mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"보이는 댓글\"}"));

        mockMvc.perform(get("/api/posts/{postId}/comments", postId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].content").value("보이는 댓글"));
    }

    @Test
    void hideComment_Returns204() throws Exception {
        Long postId = createPublishedPost();
        likelion.khu.website.feed.comment.dto.CommentCreateRequest req =
                new likelion.khu.website.feed.comment.dto.CommentCreateRequest();
        req.setContent("댓글");
        Long commentId = commentService.create(postId, req).getId();

        mockMvc.perform(patch("/api/posts/{postId}/comments/admin/{commentId}/hide", postId, commentId))
                .andExpect(status().isNoContent());
    }
}
