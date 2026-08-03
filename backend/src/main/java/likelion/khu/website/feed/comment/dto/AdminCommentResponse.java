package likelion.khu.website.feed.comment.dto;

import likelion.khu.website.feed.comment.Comment;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class AdminCommentResponse {
    private Long id;
    private Long postId;
    private String postTitle;
    private String postSlug;
    private String nickname;
    private String content;
    private LocalDateTime createdAt;
    private boolean hidden;
    private LocalDateTime hiddenAt;
    private String hiddenByAdminName;
    private String hiddenReason;
    private String anonymousActorLabel;
    private long actorCommentCount;
    private String networkLabel;
    private long networkCommentCount;
    private String userAgent;

    public static AdminCommentResponse from(
            Comment comment,
            String hiddenByAdminName,
            long actorCommentCount,
            long networkCommentCount) {
        return new AdminCommentResponse(
                comment.getId(),
                comment.getPost().getId(),
                comment.getPost().getTitle(),
                comment.getPost().getSlug(),
                comment.getNickname(),
                comment.getContent(),
                comment.getCreatedAt(),
                comment.isHidden(),
                comment.getHiddenAt(),
                hiddenByAdminName,
                comment.getHiddenReason(),
                label("익명", comment.getAnonymousActorId()),
                actorCommentCount,
                label("네트워크", comment.getIpHash()),
                networkCommentCount,
                comment.getUserAgent() == null ? "기록 없음" : comment.getUserAgent());
    }

    private static String label(String prefix, String hash) {
        if (hash == null || hash.length() < 8) return prefix + " 기록 없음";
        return prefix + " " + hash.substring(0, 8).toUpperCase();
    }
}
