package likelion.khu.website.feed.post.dto;

import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class PostSummaryResponse {
    private Long id;
    private String slug;
    private String title;
    private String summary;
    private String thumbnailUrl;
    private String authorName;
    private String authorPart;
    private PostStatus status;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;

    public static PostSummaryResponse from(Post post) {
        return new PostSummaryResponse(
                post.getId(), post.getSlug(), post.getTitle(),
                post.getSummary(), post.getThumbnailUrl(),
                post.getAuthorName(), post.getAuthorPart(), post.getStatus(),
                post.getPublishedAt(), post.getCreatedAt());
    }
}
