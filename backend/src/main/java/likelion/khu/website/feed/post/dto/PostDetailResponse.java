package likelion.khu.website.feed.post.dto;

import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostStatus;
import likelion.khu.website.member.Member;
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
    private String authorEmoji;
    private String authorPhotoUrl;
    private PostStatus status;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long commentCount;

    public static PostDetailResponse from(Post post, Member author, long commentCount) {
        boolean showProfile = author != null && author.isPublicationConsent();
        return new PostDetailResponse(
                post.getId(), post.getSlug(), post.getTitle(),
                post.getSummary(), post.getContent(), post.getThumbnailUrl(),
                post.getAuthorName(), post.getAuthorPart(),
                showProfile ? author.getEmoji() : null,
                showProfile ? author.getPhotoUrl() : null,
                post.getStatus(),
                post.getPublishedAt(), post.getCreatedAt(), post.getUpdatedAt(),
                commentCount);
    }
}
