package likelion.khu.website.feed.post;

import likelion.khu.website.feed.comment.Comment;
import likelion.khu.website.feed.comment.CommentRepository;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import likelion.khu.website.feed.post.dto.PostReplaceRequest;
import likelion.khu.website.feed.post.dto.PostSummaryResponse;
import likelion.khu.website.feed.post.exception.NotPostAuthorException;
import likelion.khu.website.feed.post.exception.PostNotFoundException;
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

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PostServiceTest {

    @Autowired PostService postService;
    @Autowired PostRepository postRepository;
    @Autowired CommentRepository commentRepository;
    @Autowired MemberRepository memberRepository;

    private Member member;
    private Member anotherMember;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.create(
                "시현", Set.of(MemberRole.BACKEND), 13, "🦁", "https://example.com/sihyeon.png",
                null, "컴퓨터공학과", true, LocalDateTime.now(), "admin@khu.ac.kr",
                "20240001", "01012345678", "hash"));
        anotherMember = memberRepository.save(Member.create(
                "선우", Set.of(MemberRole.BACKEND), 13, "🐯", null, null, "admin@khu.ac.kr",
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
        assertThat(res.getAuthorPart()).containsExactly("BACKEND");
        assertThat(res.getAuthorEmoji()).isEqualTo("🦁");
        assertThat(res.getAuthorPhotoUrl()).isEqualTo("https://example.com/sihyeon.png");
        assertThat(res.getPublishedAt()).isNotNull();
        assertThat(res.getSlug()).isNotBlank();
        assertThat(postRepository.findById(res.getId()).orElseThrow().getAuthorMemberId())
                .isEqualTo(member.getId());
    }

    @Test
    void createPost_MemberNoRoles_AuthorPartIsNull() {
        Member noRoleMember = memberRepository.save(Member.create(
                "역할없음", Set.of(), 13, "⭐", null, null, "admin@khu.ac.kr",
                "20240003", "01011112222", "hash"));

        PostDetailResponse res = postService.createPost(noRoleMember.getId(), sampleRequest());

        assertThat(res.getAuthorPart()).isEmpty();
    }

    @Test
    void getPublishedPost_AuthorWithoutPublicationConsent_HidesProfile() {
        PostDetailResponse created = postService.createPost(anotherMember.getId(), sampleRequest());

        PostDetailResponse result = postService.getPublishedPost(created.getSlug());

        assertThat(result.getAuthorName()).isEqualTo("선우");
        assertThat(result.getAuthorEmoji()).isNull();
        assertThat(result.getAuthorPhotoUrl()).isNull();
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
                .isInstanceOf(PostNotFoundException.class);
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

    @Test
    void getMemberPosts_ReturnsOnlyAuthorsPostsIncludingHidden() {
        PostDetailResponse ownVisible = postService.createPost(member.getId(), sampleRequest());
        PostDetailResponse ownHidden = postService.createPost(member.getId(), sampleRequest());
        postService.updateStatus(ownHidden.getId(), PostStatus.HIDDEN);
        postService.createPost(anotherMember.getId(), sampleRequest());

        Page<PostSummaryResponse> page = postService.getMemberPosts(member.getId(), PageRequest.of(0, 10));

        assertThat(page.getContent())
                .extracting(PostSummaryResponse::getId)
                .containsExactlyInAnyOrder(ownHidden.getId(), ownVisible.getId());
        assertThat(page.getContent())
                .anySatisfy(post -> {
                    assertThat(post.getId()).isEqualTo(ownHidden.getId());
                    assertThat(post.getStatus()).isEqualTo(PostStatus.HIDDEN);
                });
    }

    @Test
    void getMemberPost_HiddenOwnPost_ReturnsDetail() {
        PostDetailResponse created = postService.createPost(member.getId(), sampleRequest());
        postService.updateStatus(created.getId(), PostStatus.HIDDEN);

        PostDetailResponse result = postService.getMemberPost(created.getId(), member.getId());

        assertThat(result.getStatus()).isEqualTo(PostStatus.HIDDEN);
    }

    @Test
    void getMemberPost_OtherAuthorsPost_ThrowsForbidden() {
        PostDetailResponse created = postService.createPost(anotherMember.getId(), sampleRequest());

        assertThatThrownBy(() -> postService.getMemberPost(created.getId(), member.getId()))
                .isInstanceOf(NotPostAuthorException.class);
    }

    @Test
    void replacePost_OwnPost_ReplacesNullableFieldsAndPreservesIdentity() {
        PostCreateRequest create = sampleRequest();
        create.setSummary("기존 요약");
        create.setThumbnailUrl("https://example.com/old.png");
        PostDetailResponse created = postService.createPost(member.getId(), create);
        PostReplaceRequest replace = new PostReplaceRequest();
        replace.setTitle("바뀐 제목");
        replace.setSummary(null);
        replace.setContent("# Markdown 본문");
        replace.setThumbnailUrl(null);

        PostDetailResponse result = postService.replacePost(created.getId(), member.getId(), replace);

        assertThat(result.getSlug()).isEqualTo(created.getSlug());
        assertThat(result.getAuthorName()).isEqualTo(created.getAuthorName());
        assertThat(result.getStatus()).isEqualTo(PostStatus.PUBLISHED);
        assertThat(result.getTitle()).isEqualTo("바뀐 제목");
        assertThat(result.getSummary()).isNull();
        assertThat(result.getContent()).isEqualTo("# Markdown 본문");
        assertThat(result.getThumbnailUrl()).isNull();
    }

    @Test
    void replacePost_OtherAuthorsPost_ThrowsForbidden() {
        PostDetailResponse created = postService.createPost(anotherMember.getId(), sampleRequest());
        PostReplaceRequest replace = new PostReplaceRequest();
        replace.setTitle("바뀐 제목");
        replace.setContent("본문");

        assertThatThrownBy(() -> postService.replacePost(created.getId(), member.getId(), replace))
                .isInstanceOf(NotPostAuthorException.class);
    }

    @Test
    void deletePost_OwnPost_DeletesPostAndComments() {
        PostDetailResponse created = postService.createPost(member.getId(), sampleRequest());
        Post post = postRepository.findById(created.getId()).orElseThrow();
        commentRepository.save(Comment.create(post, "익명", "댓글"));

        postService.deletePost(created.getId(), member.getId());

        assertThat(postRepository.findById(created.getId())).isEmpty();
        assertThat(commentRepository.findAll()).isEmpty();
    }

    @Test
    void deletePost_MissingPost_ThrowsNotFound() {
        assertThatThrownBy(() -> postService.deletePost(999L, member.getId()))
                .isInstanceOf(PostNotFoundException.class);
    }
}
