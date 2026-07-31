package likelion.khu.website.feed.comment;

import jakarta.servlet.http.Cookie;
import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.auth.JwtProvider;
import likelion.khu.website.feed.post.PostService;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.MemberRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CommentControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired CommentService commentService;
    @Autowired PostService postService;
    @Autowired MemberRepository memberRepository;
    @Autowired AdminRepository adminRepository;
    @Autowired JwtProvider jwtProvider;
    @Autowired CommentModerationEventRepository moderationEventRepository;

    private Member member;
    private Admin admin;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.create(
                "시현", Set.of(MemberRole.BACKEND), 13, "🦁", null, null, "admin@khu.ac.kr",
                "20240001", "01012345678", "hash"));
        admin = adminRepository.save(Admin.register(
                "comment-admin@khu.ac.kr", "댓글 관리자", "hash"));
    }

    private Long createPublishedPost() {
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("본문");
        return postService.createPost(member.getId(), req).getId();
    }

    @Test
    void createComment_ValidRequest_Returns201() throws Exception {
        Long postId = createPublishedPost();

        mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"구경꾼\",\"content\":\"좋은 글!\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("comment_actor=")))
                .andExpect(jsonPath("$.nickname").value("구경꾼"))
                .andExpect(jsonPath("$.content").value("좋은 글!"))
                .andExpect(jsonPath("$.hidden").value(false));
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
    void listComments_RedactsHiddenCommentButPreservesItsPosition() throws Exception {
        Long postId = createPublishedPost();
        likelion.khu.website.feed.comment.dto.CommentCreateRequest req =
                new likelion.khu.website.feed.comment.dto.CommentCreateRequest();
        req.setContent("숨길 댓글");
        Long hiddenId = commentService.create(postId, req, tracking()).getId();
        commentService.updateVisibility(hiddenId, true, admin.getId(), "테스트");

        mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"보이는 댓글\"}"));

        mockMvc.perform(get("/api/posts/{postId}/comments", postId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].hidden").value(true))
                .andExpect(jsonPath("$[0].content").doesNotExist())
                .andExpect(jsonPath("$[0].nickname").doesNotExist())
                .andExpect(jsonPath("$[1].content").value("보이는 댓글"));
    }

    @Test
    void legacyHideCommentEndpoint_RequiresAuthentication() throws Exception {
        Long postId = createPublishedPost();
        likelion.khu.website.feed.comment.dto.CommentCreateRequest req =
                new likelion.khu.website.feed.comment.dto.CommentCreateRequest();
        req.setContent("댓글");
        Long commentId = commentService.create(postId, req, tracking()).getId();

        mockMvc.perform(patch("/api/posts/{postId}/comments/admin/{commentId}/hide", postId, commentId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanTraceHideAndRestoreComments() throws Exception {
        Long postId = createPublishedPost();
        MvcResult first = mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("User-Agent", "Mozilla/5.0 Chrome/120.0")
                        .content("{\"content\":\"첫 댓글\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String actorToken = first.getResponse().getHeader("Set-Cookie")
                .split(";", 2)[0].split("=", 2)[1];

        MvcResult second = mockMvc.perform(post("/api/posts/{postId}/comments", postId)
                        .cookie(new Cookie(CommentTrackingService.COOKIE_NAME, actorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("User-Agent", "Mozilla/5.0 Chrome/120.0")
                        .content("{\"content\":\"가릴 댓글\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Number commentIdValue = com.jayway.jsonpath.JsonPath.read(
                second.getResponse().getContentAsString(), "$.id");
        long commentId = commentIdValue.longValue();

        Cookie accessCookie = new Cookie("access_token", jwtProvider.createAccessToken(admin));
        mockMvc.perform(get("/api/admin/comments").cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].actorCommentCount").value(2))
                .andExpect(jsonPath("$[0].anonymousActorLabel").value(
                        org.hamcrest.Matchers.startsWith("익명 ")))
                .andExpect(jsonPath("$[0].userAgent").value("데스크톱 · Chrome"));

        mockMvc.perform(patch("/api/admin/comments/{id}/visibility", commentId)
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hidden\":true,\"reason\":\"운영 정책 위반\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hidden").value(true))
                .andExpect(jsonPath("$.hiddenByAdminName").value("댓글 관리자"));

        mockMvc.perform(get("/api/posts/{postId}/comments", postId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[1].hidden").value(true))
                .andExpect(jsonPath("$[1].content").doesNotExist());
        org.assertj.core.api.Assertions.assertThat(moderationEventRepository.count()).isEqualTo(1);

        mockMvc.perform(patch("/api/admin/comments/{id}/visibility", commentId)
                        .cookie(accessCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hidden\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hidden").value(false));
        org.assertj.core.api.Assertions.assertThat(moderationEventRepository.count()).isEqualTo(2);
    }

    private CommentTrackingService.TrackingResult tracking() {
        return new CommentTrackingService.TrackingResult(
                "actor-test", "network-test", "데스크톱 · Chrome", null);
    }
}
