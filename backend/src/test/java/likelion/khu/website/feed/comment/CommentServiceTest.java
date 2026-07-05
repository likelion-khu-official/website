package likelion.khu.website.feed.comment;

import likelion.khu.website.feed.MagicLinkTokenService;
import likelion.khu.website.feed.comment.dto.CommentCreateRequest;
import likelion.khu.website.feed.comment.dto.CommentResponse;
import likelion.khu.website.feed.dto.MagicLinkTokenIssueRequest;
import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostRepository;
import likelion.khu.website.feed.post.PostService;
import likelion.khu.website.feed.post.PostStatus;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.feed.post.dto.PostDetailResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class CommentServiceTest {

    @Autowired CommentService commentService;
    @Autowired CommentRepository commentRepository;
    @Autowired PostService postService;
    @Autowired PostRepository postRepository;
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

    private CommentCreateRequest commentRequest(String nickname, String content) {
        CommentCreateRequest req = new CommentCreateRequest();
        req.setNickname(nickname);
        req.setContent(content);
        return req;
    }

    @Test
    void create_WithNickname_SavesNickname() {
        Long postId = createPublishedPost();
        CommentResponse res = commentService.create(postId, commentRequest("구경꾼", "좋아요!"));

        assertThat(res.getNickname()).isEqualTo("구경꾼");
        assertThat(res.getContent()).isEqualTo("좋아요!");
    }

    @Test
    void create_WithoutNickname_SavesNull() {
        Long postId = createPublishedPost();
        CommentResponse res = commentService.create(postId, commentRequest(null, "익명 댓글"));

        assertThat(res.getNickname()).isNull();
    }

    @Test
    void create_DraftPost_ThrowsNotFound() {
        String token = magicLinkTokenService.issue(new MagicLinkTokenIssueRequest("시현")).getToken();
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("초안");
        req.setContent("내용");
        Long draftId = postService.createPost(token, req).getId();

        assertThatThrownBy(() -> commentService.create(draftId, commentRequest(null, "댓글")))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void list_ReturnsOnlyVisibleComments() {
        Long postId = createPublishedPost();
        CommentResponse visible = commentService.create(postId, commentRequest(null, "보이는 댓글"));
        CommentResponse toHide = commentService.create(postId, commentRequest(null, "숨길 댓글"));
        commentService.hide(toHide.getId());

        List<CommentResponse> list = commentService.list(postId);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getId()).isEqualTo(visible.getId());
    }

    @Test
    void hide_HidesComment() {
        Long postId = createPublishedPost();
        CommentResponse comment = commentService.create(postId, commentRequest(null, "댓글"));

        commentService.hide(comment.getId());

        assertThat(commentRepository.findById(comment.getId()).orElseThrow().isHidden()).isTrue();
    }

    @Test
    void hide_NotFound_ThrowsResponseStatusException() {
        assertThatThrownBy(() -> commentService.hide(999L))
                .isInstanceOf(ResponseStatusException.class);
    }
}
