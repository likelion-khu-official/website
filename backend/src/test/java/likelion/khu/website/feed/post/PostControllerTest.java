package likelion.khu.website.feed.post;

import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.MemberRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PostControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired PostService postService;
    @Autowired MemberRepository memberRepository;

    // @DirtiesContext로 DB가 매 테스트마다 초기화되므로 첫 INSERT는 항상 id=1
    // @WithMockAdminUser(id = 1L, role = "MEMBER")와 짝을 맞춘다
    private Member member;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.create(
                "시현", Set.of(MemberRole.BE), 13, "🦁", null, null, "admin@khu.ac.kr",
                "20240001", "01012345678", "hash"));
    }

    private Long createPublishedPost() throws Exception {
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("본문");
        return postService.createPost(member.getId(), req).getId();
    }

    @Test
    @WithMockAdminUser(id = 1L, role = "MEMBER")
    void createPost_LoggedInMember_Returns201() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"제목\",\"content\":\"본문\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.authorName").value("시현"))
                .andExpect(jsonPath("$.authorPart").value("BE"))
                .andExpect(jsonPath("$.slug").isNotEmpty());
    }

    @Test
    void createPost_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"제목\",\"content\":\"본문\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockAdminUser(id = 1L, role = "MEMBER")
    void createPost_BlankTitle_Returns400() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"content\":\"본문\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listPosts_ReturnsOnlyPublished() throws Exception {
        Long id = createPublishedPost();
        postService.updateStatus(id, PostStatus.HIDDEN);  // 숨김 — 목록에 안 나옴
        createPublishedPost();                             // published — 목록에 나옴

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void getPost_PublishedPost_Returns200() throws Exception {
        createPublishedPost();
        String slug = postService.getAdminPosts(org.springframework.data.domain.PageRequest.of(0, 1))
                .getContent().get(0).getSlug();

        mockMvc.perform(get("/api/posts/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("본문"));
    }

    @Test
    void getPost_HiddenSlug_Returns404() throws Exception {
        Long id = createPublishedPost();
        String slug = postService.getAdminPosts(org.springframework.data.domain.PageRequest.of(0, 1))
                .getContent().get(0).getSlug();
        postService.updateStatus(id, PostStatus.HIDDEN);

        mockMvc.perform(get("/api/posts/{slug}", slug))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void updateStatus_PublishedToHidden_Returns200() throws Exception {
        Long id = postService.createPost(member.getId(), sampleRequest()).getId();

        mockMvc.perform(patch("/api/admin/posts/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"HIDDEN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"));
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void updateStatus_InvalidTransition_Returns400() throws Exception {
        Long id = postService.createPost(member.getId(), sampleRequest()).getId();

        mockMvc.perform(patch("/api/admin/posts/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockAdminUser(role = "SUPER_ADMIN")
    void adminList_SuperAdmin_Returns200() throws Exception {
        mockMvc.perform(get("/api/admin/posts"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockAdminUser(role = "MEMBER")
    void adminList_Member_Returns403() throws Exception {
        mockMvc.perform(get("/api/admin/posts"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockAdminUser(role = "MEMBER")
    void updateStatus_Member_Returns403() throws Exception {
        Long id = postService.createPost(member.getId(), sampleRequest()).getId();

        mockMvc.perform(patch("/api/admin/posts/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateStatus_NoCookie_Returns401() throws Exception {
        mockMvc.perform(patch("/api/admin/posts/{id}/status", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockAdminUser(role = "MEMBER", mustChangePassword = true)
    void adminList_MemberMustChangePassword_Returns403ForbiddenNotGuard() throws Exception {
        mockMvc.perform(get("/api/admin/posts"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @WithMockAdminUser(role = "MEMBER", mustChangePassword = true)
    void updateStatus_MemberMustChangePassword_Returns403ViaGuardBeforeRoleCheck() throws Exception {
        Long id = postService.createPost(member.getId(), sampleRequest()).getId();

        mockMvc.perform(patch("/api/admin/posts/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
    }

    private PostCreateRequest sampleRequest() {
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("내용");
        return req;
    }
}
