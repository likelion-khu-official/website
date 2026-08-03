package likelion.khu.website.feed.comment;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.feed.comment.dto.CommentCreateRequest;
import likelion.khu.website.feed.comment.dto.CommentResponse;
import likelion.khu.website.feed.post.PostRepository;
import likelion.khu.website.feed.post.PostService;
import likelion.khu.website.feed.post.PostStatus;
import likelion.khu.website.feed.post.dto.PostCreateRequest;
import likelion.khu.website.member.Member;
import likelion.khu.website.member.MemberRepository;
import likelion.khu.website.member.MemberRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class CommentServiceTest {

    @Autowired CommentService commentService;
    @Autowired CommentRepository commentRepository;
    @Autowired PostService postService;
    @Autowired PostRepository postRepository;
    @Autowired MemberRepository memberRepository;
    @Autowired AdminRepository adminRepository;

    private Member member;
    private Admin admin;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.create(
                "시현", Set.of(MemberRole.BACKEND), 13, "🦁", null, null, "admin@khu.ac.kr",
                "20240001", "01012345678", "hash"));
        admin = adminRepository.save(Admin.register(
                "comment-service-admin@khu.ac.kr", "댓글 관리자", "hash"));
    }

    private Long createPublishedPost() {
        PostCreateRequest req = new PostCreateRequest();
        req.setTitle("제목");
        req.setContent("본문");
        return postService.createPost(member.getId(), req).getId();
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
        CommentResponse res = commentService.create(
                postId, commentRequest("구경꾼", "좋아요!"), tracking());

        assertThat(res.getNickname()).isEqualTo("구경꾼");
        assertThat(res.getContent()).isEqualTo("좋아요!");
    }

    @Test
    void create_WithoutNickname_SavesNull() {
        Long postId = createPublishedPost();
        CommentResponse res = commentService.create(
                postId, commentRequest(null, "익명 댓글"), tracking());

        assertThat(res.getNickname()).isNull();
    }

    @Test
    void create_HiddenPost_ThrowsNotFound() {
        Long hiddenId = createPublishedPost();
        postService.updateStatus(hiddenId, PostStatus.HIDDEN);

        assertThatThrownBy(() -> commentService.create(
                hiddenId, commentRequest(null, "댓글"), tracking()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void list_RedactsHiddenCommentAndPreservesVisibleComment() {
        Long postId = createPublishedPost();
        CommentResponse visible = commentService.create(
                postId, commentRequest(null, "보이는 댓글"), tracking());
        CommentResponse toHide = commentService.create(
                postId, commentRequest(null, "숨길 댓글"), tracking());
        commentService.updateVisibility(toHide.getId(), true, admin.getId(), "테스트");

        List<CommentResponse> list = commentService.list(postId);

        assertThat(list).hasSize(2);
        assertThat(list.get(0).getId()).isEqualTo(visible.getId());
        assertThat(list.get(1).isHidden()).isTrue();
        assertThat(list.get(1).getContent()).isNull();
        assertThat(list.get(1).getNickname()).isNull();
    }

    @Test
    void hide_HidesComment() {
        Long postId = createPublishedPost();
        CommentResponse comment = commentService.create(
                postId, commentRequest(null, "댓글"), tracking());

        commentService.updateVisibility(comment.getId(), true, admin.getId(), "테스트");

        assertThat(commentRepository.findById(comment.getId()).orElseThrow().isHidden()).isTrue();
    }

    @Test
    void hide_NotFound_ThrowsResponseStatusException() {
        assertThatThrownBy(() -> commentService.updateVisibility(
                999L, true, admin.getId(), "테스트"))
                .isInstanceOf(ResponseStatusException.class);
    }

    private CommentTrackingService.TrackingResult tracking() {
        return new CommentTrackingService.TrackingResult(
                "actor-test", "network-test", "데스크톱 · Chrome", null);
    }
}
