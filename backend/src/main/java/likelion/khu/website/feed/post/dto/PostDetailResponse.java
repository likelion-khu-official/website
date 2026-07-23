package likelion.khu.website.feed.post.dto;

import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class PostDetailResponse {
    private Long id;
    private String slug;
    private String title;
    private String summary;
    private String content;
    private String thumbnailUrl;
    private String authorName;
    private String authorPart;
    private PostStatus status;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long commentCount;

    public static PostDetailResponse from(Post post, long commentCount) {
        return new PostDetailResponse(
                post.getId(), post.getSlug(), post.getTitle(),
                post.getSummary(), post.getContent(), post.getThumbnailUrl(),
                post.getAuthorName(), post.getAuthorPart(), post.getStatus(),
                post.getPublishedAt(), post.getCreatedAt(), post.getUpdatedAt(),
                commentCount);
    }
}
