package likelion.khu.website.feed.comment;

import jakarta.validation.Valid;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.feed.comment.dto.AdminCommentResponse;
import likelion.khu.website.feed.comment.dto.CommentVisibilityRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/comments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCommentController {

    private final CommentService commentService;

    @GetMapping
    public List<AdminCommentResponse> list() {
        return commentService.adminList();
    }

    @PatchMapping("/{commentId}/visibility")
    public AdminCommentResponse updateVisibility(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentVisibilityRequest request,
            @AuthenticationPrincipal AdminPrincipal principal) {
        return commentService.updateVisibility(
                commentId, request.isHidden(), principal.getId(), request.getReason());
    }
}
