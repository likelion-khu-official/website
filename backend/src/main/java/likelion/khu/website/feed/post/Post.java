package likelion.khu.website.feed.post;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
@Getter
@NoArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private String authorName;

    private String authorPart;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status = PostStatus.DRAFT;

    @Column(columnDefinition = "TEXT")
    private String summary;

    private String thumbnailUrl;

    private LocalDateTime publishedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static Post create(String slug, String title, String summary, String content,
                              String authorName, String authorPart, String thumbnailUrl) {
        Post p = new Post();
        p.slug = slug;
        p.title = title;
        p.summary = summary;
        p.content = content;
        p.authorName = authorName;
        p.authorPart = authorPart;
        p.thumbnailUrl = thumbnailUrl;
        p.status = PostStatus.DRAFT;
        LocalDateTime now = LocalDateTime.now();
        p.createdAt = now;
        p.updatedAt = now;
        return p;
    }

    public void transitionTo(PostStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new IllegalStateException("상태 전이 불가: " + status + " → " + next);
        }
        if (next == PostStatus.PUBLISHED && publishedAt == null) {
            publishedAt = LocalDateTime.now();
        }
        status = next;
        updatedAt = LocalDateTime.now();
    }
}
