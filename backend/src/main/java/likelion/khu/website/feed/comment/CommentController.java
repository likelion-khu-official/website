package likelion.khu.website.feed.comment;

import jakarta.servlet.http.HttpServletRequest;
import likelion.khu.website.feed.comment.dto.CommentCreateRequest;
import likelion.khu.website.feed.comment.dto.CommentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final CommentTrackingService commentTrackingService;

    @PostMapping
    public ResponseEntity<CommentResponse> create(
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateRequest request,
            HttpServletRequest servletRequest) {
        CommentTrackingService.TrackingResult tracking = commentTrackingService.resolve(servletRequest);
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.CREATED);
        if (tracking.cookie() != null) {
            response.header(HttpHeaders.SET_COOKIE, tracking.cookie().toString());
        }
        return response.body(commentService.create(postId, request, tracking));
    }

    @GetMapping
    public List<CommentResponse> list(@PathVariable Long postId) {
        return commentService.list(postId);
    }

}
