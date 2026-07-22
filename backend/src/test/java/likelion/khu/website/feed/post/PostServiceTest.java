package likelion.khu.website.feed.post;

import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import likelion.khu.website.feed.post.dto.PostSummaryResponse;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.MemberRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PostServiceTest {

    @Autowired PostService postService;
    @Autowired PostRepository postRepository;
    @Autowired MemberRepository memberRepository;

    private Member member;
    private Member anotherMember;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.create(
                "시현", Set.of(MemberRole.BE), 13, "🦁", null, null, "admin@khu.ac.kr",
                "20240001", "01012345678", "hash"));
        anotherMember = memberRepository.save(Member.create(
                "선우", Set.of(MemberRole.BE), 13, "🐯", null, null, "admin@khu.ac.kr",
                "20240002", "01087654321", "hash"));
    }

    private PostCreateRequest sampleRequest() {
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("본문");
        return req;
    }

    @Test
    void createPost_LoggedInMember_CreatesPublishedWithAuthorInfo() {
        PostDetailResponse res = postService.createPost(member.getId(), sampleRequest());

        assertThat(res.getStatus()).isEqualTo(PostStatus.PUBLISHED);
        assertThat(res.getAuthorName()).isEqualTo("시현");
        assertThat(res.getAuthorPart()).isEqualTo("BE");
        assertThat(res.getPublishedAt()).isNotNull();
        assertThat(res.getSlug()).isNotBlank();
    }

    @Test
    void createPost_MemberNoRoles_AuthorPartIsNull() {
        Member noRoleMember = memberRepository.save(Member.create(
                "역할없음", Set.of(), 13, "⭐", null, null, "admin@khu.ac.kr",
                "20240003", "01011112222", "hash"));

        PostDetailResponse res = postService.createPost(noRoleMember.getId(), sampleRequest());

        assertThat(res.getAuthorPart()).isNull();
    }

    @Test
    void getPublishedPosts_ReturnsOnlyPublished() {
        PostDetailResponse visible = postService.createPost(member.getId(), sampleRequest());
        PostDetailResponse toHide = postService.createPost(anotherMember.getId(), sampleRequest());
        postService.updateStatus(toHide.getId(), PostStatus.HIDDEN);

        Page<PostSummaryResponse> page = postService.getPublishedPosts(PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getId()).isEqualTo(visible.getId());
    }

    @Test
    void getPublishedPost_PublishedPost_ReturnsDetail() {
        PostDetailResponse created = postService.createPost(member.getId(), sampleRequest());

        PostDetailResponse res = postService.getPublishedPost(created.getSlug());

        assertThat(res.getId()).isEqualTo(created.getId());
        assertThat(res.getContent()).isEqualTo("본문");
    }

    @Test
    void getPublishedPost_HiddenSlug_ThrowsNotFound() {
        PostDetailResponse created = postService.createPost(member.getId(), sampleRequest());
        postService.updateStatus(created.getId(), PostStatus.HIDDEN);

        assertThatThrownBy(() -> postService.getPublishedPost(created.getSlug()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void updateStatus_PublishedToHidden_PreservesPublishedAt() {
        PostDetailResponse created = postService.createPost(member.getId(), sampleRequest());
        LocalDateTime publishedAt = postRepository.findById(created.getId()).orElseThrow().getPublishedAt();

        postService.updateStatus(created.getId(), PostStatus.HIDDEN);

        assertThat(postRepository.findById(created.getId()).orElseThrow().getPublishedAt())
                .isEqualTo(publishedAt);
    }

    @Test
    void updateStatus_HiddenToPublished_ReturnsPublished() {
        PostDetailResponse created = postService.createPost(member.getId(), sampleRequest());
        postService.updateStatus(created.getId(), PostStatus.HIDDEN);

        PostSummaryResponse res = postService.updateStatus(created.getId(), PostStatus.PUBLISHED);

        assertThat(res.getStatus()).isEqualTo(PostStatus.PUBLISHED);
    }

    @Test
    void updateStatus_PublishedToPublished_ThrowsIllegalState() {
        PostDetailResponse created = postService.createPost(member.getId(), sampleRequest());

        assertThatThrownBy(() -> postService.updateStatus(created.getId(), PostStatus.PUBLISHED))
                .isInstanceOf(IllegalStateException.class);
    }
}
