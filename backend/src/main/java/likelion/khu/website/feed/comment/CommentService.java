package likelion.khu.website.feed.comment;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.audit.AuditChanges;
import likelion.khu.website.audit.AuditOutcome;
import likelion.khu.website.audit.AuditService;
import likelion.khu.website.feed.comment.dto.AdminCommentResponse;
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

import java.util.Map;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentModerationEventRepository moderationEventRepository;
    private final PostRepository postRepository;
    private final AdminRepository adminRepository;
    private final AuditService auditService;

    @Transactional
    public CommentResponse create(Long postId, CommentCreateRequest request,
                                  CommentTrackingService.TrackingResult tracking) {
        Post post = postRepository.findByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없어요."));
        Comment comment = Comment.create(
                post,
                request.getNickname(),
                request.getContent(),
                tracking.actorId(),
                tracking.ipHash(),
                tracking.userAgent());
        return CommentResponse.from(commentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> list(Long postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId)
                .stream().map(CommentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminCommentResponse> adminList() {
        List<Comment> comments = commentRepository.findAllByOrderByCreatedAtDesc();
        Map<String, Long> actorCounts = comments.stream()
                .filter(comment -> comment.getAnonymousActorId() != null)
                .collect(Collectors.groupingBy(Comment::getAnonymousActorId, Collectors.counting()));
        Map<String, Long> networkCounts = comments.stream()
                .filter(comment -> comment.getIpHash() != null)
                .collect(Collectors.groupingBy(Comment::getIpHash, Collectors.counting()));
        Map<Long, Admin> admins = adminRepository.findAll().stream()
                .collect(Collectors.toMap(Admin::getId, Function.identity()));

        return comments.stream()
                .map(comment -> AdminCommentResponse.from(
                        comment,
                        comment.getHiddenByAdminId() == null
                                ? null
                                : admins.getOrDefault(comment.getHiddenByAdminId(), null) == null
                                    ? "삭제된 관리자"
                                    : admins.get(comment.getHiddenByAdminId()).getName(),
                        actorCounts.getOrDefault(comment.getAnonymousActorId(), 0L),
                        networkCounts.getOrDefault(comment.getIpHash(), 0L)))
                .toList();
    }

    @Transactional
    public AdminCommentResponse updateVisibility(
            Long commentId, boolean hidden, Long adminId, String reason) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없어요."));
        String normalizedReason = reason == null || reason.isBlank() ? null : reason.trim();
        comment.updateVisibility(hidden, adminId, normalizedReason);
        moderationEventRepository.save(
                CommentModerationEvent.create(comment, hidden, adminId, normalizedReason));
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자를 찾을 수 없어요."));
        long actorCount = comment.getAnonymousActorId() == null ? 0
                : commentRepository.findAll().stream()
                    .filter(item -> comment.getAnonymousActorId().equals(item.getAnonymousActorId())).count();
        long networkCount = comment.getIpHash() == null ? 0
                : commentRepository.findAll().stream()
                    .filter(item -> comment.getIpHash().equals(item.getIpHash())).count();
        String detail = new AuditChanges().value("사유", normalizedReason).toDetailOrNull();
        auditService.recordStateChange((hidden ? "댓글 가리기" : "댓글 공개") + " #" + commentId,
                detail, "COMMENT", commentId, AuditOutcome.SUCCESS);
        return AdminCommentResponse.from(comment, hidden ? admin.getName() : null, actorCount, networkCount);
    }
}
