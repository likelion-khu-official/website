package likelion.khu.website.feed.post;

import likelion.khu.website.feed.MagicLinkToken;
import likelion.khu.website.feed.MagicLinkTokenRepository;
import likelion.khu.website.feed.MagicLinkTokenService;
import likelion.khu.website.feed.dto.MagicLinkTokenIssueRequest;
import likelion.khu.website.feed.exception.MagicLinkTokenAlreadyUsedException;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import likelion.khu.website.feed.post.dto.PostStatusUpdateRequest;
import likelion.khu.website.feed.post.dto.PostSummaryResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PostServiceTest {

    @Autowired PostService postService;
    @Autowired MagicLinkTokenService magicLinkTokenService;
    @Autowired MagicLinkTokenRepository tokenRepository;
    @Autowired PostRepository postRepository;

    private String issueToken() {
        return magicLinkTokenService.issue(new MagicLinkTokenIssueRequest("시현")).getToken();
    }

    private PostCreateRequest sampleRequest() {
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("본문");
        return req;
    }

    @Test
    void createPost_ValidToken_CreatesDraftPost() {
        String token = issueToken();
        PostDetailResponse res = postService.createPost(token, sampleRequest());

        assertThat(res.getStatus()).isEqualTo(PostStatus.DRAFT);
        assertThat(res.getAuthorName()).isEqualTo("시현");
        assertThat(res.getPublishedAt()).isNull();
        assertThat(res.getSlug()).isNotBlank();
    }

    @Test
    void createPost_UsedToken_ThrowsAlreadyUsed() {
        String token = issueToken();
        postService.createPost(token, sampleRequest());

        assertThatThrownBy(() -> postService.createPost(token, sampleRequest()))
                .isInstanceOf(MagicLinkTokenAlreadyUsedException.class);
    }

    @Test
    void createPost_ExpiredToken_ThrowsExpired() {
        MagicLinkToken expired = tokenRepository.save(
                new MagicLinkToken("expired-token", "시현", LocalDateTime.now().minusMinutes(1)));

        assertThatThrownBy(() -> postService.createPost(expired.getToken(), sampleRequest()))
                .isInstanceOf(likelion.khu.website.feed.exception.MagicLinkTokenExpiredException.class);
    }

    @Test
    void getPublishedPosts_ReturnsOnlyPublished() {
        String t1 = issueToken();
        String t2 = magicLinkTokenService.issue(new MagicLinkTokenIssueRequest("선우")).getToken();
        PostDetailResponse draft = postService.createPost(t1, sampleRequest());
        PostDetailResponse toPublish = postService.createPost(t2, sampleRequest());
        postService.updateStatus(toPublish.getId(), PostStatus.PUBLISHED);

        Page<PostSummaryResponse> page = postService.getPublishedPosts(PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getId()).isEqualTo(toPublish.getId());
    }

    @Test
    void getPublishedPost_PublishedPost_ReturnsDetail() {
        String token = issueToken();
        PostDetailResponse created = postService.createPost(token, sampleRequest());
        postService.updateStatus(created.getId(), PostStatus.PUBLISHED);

        PostDetailResponse res = postService.getPublishedPost(created.getSlug());

        assertThat(res.getId()).isEqualTo(created.getId());
        assertThat(res.getContent()).isEqualTo("본문");
    }

    @Test
    void getPublishedPost_DraftSlug_ThrowsNotFound() {
        String token = issueToken();
        PostDetailResponse draft = postService.createPost(token, sampleRequest());

        assertThatThrownBy(() -> postService.getPublishedPost(draft.getSlug()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void updateStatus_DraftToPublished_SetsPublishedAt() {
        String token = issueToken();
        PostDetailResponse created = postService.createPost(token, sampleRequest());

        PostSummaryResponse res = postService.updateStatus(created.getId(), PostStatus.PUBLISHED);

        assertThat(res.getStatus()).isEqualTo(PostStatus.PUBLISHED);
        assertThat(res.getPublishedAt()).isNotNull();
    }

    @Test
    void updateStatus_PublishedToHidden_PreservesPublishedAt() {
        String token = issueToken();
        PostDetailResponse created = postService.createPost(token, sampleRequest());
        postService.updateStatus(created.getId(), PostStatus.PUBLISHED);
        LocalDateTime publishedAt = postRepository.findById(created.getId()).orElseThrow().getPublishedAt();

        postService.updateStatus(created.getId(), PostStatus.HIDDEN);

        assertThat(postRepository.findById(created.getId()).orElseThrow().getPublishedAt())
                .isEqualTo(publishedAt);
    }

    @Test
    void updateStatus_InvalidTransition_ThrowsIllegalState() {
        String token = issueToken();
        PostDetailResponse created = postService.createPost(token, sampleRequest());

        assertThatThrownBy(() -> postService.updateStatus(created.getId(), PostStatus.HIDDEN))
                .isInstanceOf(IllegalStateException.class);
    }
}
