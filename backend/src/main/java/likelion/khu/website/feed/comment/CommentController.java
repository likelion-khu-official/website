package likelion.khu.website.feed.comment;

import likelion.khu.website.feed.comment.dto.CommentCreateRequest;
import likelion.khu.website.feed.comment.dto.CommentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentResponse> create(
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.create(postId, request));
    }

    @GetMapping
    public List<CommentResponse> list(@PathVariable Long postId) {
        return commentService.list(postId);
    }

    // ── 어드민 (TODO: 인증 추가) ──────────────────────────────────────

    @PatchMapping("/admin/{commentId}/hide")
    public ResponseEntity<Void> hide(@PathVariable Long postId, @PathVariable Long commentId) {
        commentService.hide(commentId);
        return ResponseEntity.noContent().build();
    }
}
