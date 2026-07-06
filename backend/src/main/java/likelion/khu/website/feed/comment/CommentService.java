package likelion.khu.website.feed.comment;

import likelion.khu.website.feed.comment.dto.CommentCreateRequest;
import likelion.khu.website.feed.comment.dto.CommentResponse;
import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostRepository;
import likelion.khu.website.feed.post.PostStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;

    @Transactional
    public CommentResponse create(Long postId, CommentCreateRequest request) {
        Post post = postRepository.findByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없어요."));
        Comment comment = Comment.create(post, request.getNickname(), request.getContent());
        return CommentResponse.from(commentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> list(Long postId) {
        return commentRepository.findByPostIdAndHiddenFalseOrderByCreatedAtAsc(postId)
                .stream().map(CommentResponse::from).toList();
    }

    @Transactional
    public void hide(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없어요."));
        comment.hide();
    }
}
