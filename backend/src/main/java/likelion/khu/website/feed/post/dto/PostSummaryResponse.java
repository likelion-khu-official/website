package likelion.khu.website.feed.post.dto;

import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostStatus;
import likelion.khu.website.member.Member;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class PostSummaryResponse {
    private Long id;
    private String slug;
    private String title;
    private String summary;
    private String thumbnailUrl;
    private String authorName;
    private List<String> authorPart;
    private String authorEmoji;
    private String authorPhotoUrl;
    private PostStatus status;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;

    public static PostSummaryResponse from(Post post, Member author) {
        boolean showProfile = author != null && author.isPublicationConsent();
        return new PostSummaryResponse(
                post.getId(), post.getSlug(), post.getTitle(),
                post.getSummary(), post.getThumbnailUrl(),
                post.getAuthorName(), post.getAuthorPart(),
                showProfile ? author.getEmoji() : null,
                showProfile ? author.getPhotoUrl() : null,
                post.getStatus(),
                post.getPublishedAt(), post.getCreatedAt());
    }
}
