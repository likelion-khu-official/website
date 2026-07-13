package likelion.khu.website.feed.comment.dto;

import likelion.khu.website.feed.comment.Comment;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class CommentResponse {
    private Long id;
    private String nickname;
    private String content;
    private LocalDateTime createdAt;

    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getNickname(),
                comment.getContent(),
                comment.getCreatedAt());
    }
}
