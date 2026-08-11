package likelion.khu.website.feed.post.dto;

import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostStatus;
import likelion.khu.website.member.Member;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
    private Long authorMemberId;
    private List<String> authorPart;
    private String authorEmoji;
    private String authorPhotoUrl;
    private List<PostBylineResponse> coauthors;
    /** 멤버 편집 응답에서만 내려가는 선택값. 공개 상세에서는 null이라 직렬화되지 않는다. */
    private List<Long> coauthorMemberIds;
    private PostStatus status;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long commentCount;

    public static PostDetailResponse from(
            Post post, Member author, Map<Long, Member> membersById,
            long commentCount, boolean includeSelectionIds) {
        boolean showProfile = author != null && author.isPublicationConsent();
        List<PostBylineResponse> coauthors = post.getCoauthors().stream()
                .map(snapshot -> PostBylineResponse.from(snapshot, membersById.get(snapshot.memberId())))
                .toList();
        return new PostDetailResponse(
                post.getId(), post.getSlug(), post.getTitle(),
                post.getSummary(), post.getContent(), post.getThumbnailUrl(),
                post.getAuthorName(), showProfile ? post.getAuthorMemberId() : null,
                post.getAuthorPart(),
                showProfile ? author.getEmoji() : null,
                showProfile ? author.getPhotoUrl() : null,
                coauthors,
                includeSelectionIds
                        ? post.getCoauthors().stream().map(snapshot -> snapshot.memberId()).toList()
                        : null,
                post.getStatus(),
                post.getPublishedAt(), post.getCreatedAt(), post.getUpdatedAt(),
                commentCount);
    }
}
