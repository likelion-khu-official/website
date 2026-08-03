package likelion.khu.website.feed.post;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "posts")
@Getter
@NoArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private String authorName;

    // DB에는 JSON 문자열로 저장, API에선 List<String>으로 노출
    @Column(columnDefinition = "TEXT")
    private String authorPartJson;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public List<String> getAuthorPart() {
        if (authorPartJson == null) return Collections.emptyList();
        try {
            return MAPPER.readValue(authorPartJson, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    // 이름·파트는 공개 당시의 스냅샷이고, 이 값은 수정·삭제 권한 판정용 불변 소유자 ID다.
    // V5 이전 글은 안전하게 소유자를 추론할 수 없어 null일 수 있다.
    private Long authorMemberId;

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
                              String authorName, List<String> authorParts, Long authorMemberId,
                              String thumbnailUrl) {
        Post p = new Post();
        p.slug = slug;
        p.title = title;
        p.summary = summary;
        p.content = content;
        p.authorName = authorName;
        try {
            p.authorPartJson = MAPPER.writeValueAsString(authorParts != null ? authorParts : Collections.emptyList());
        } catch (JsonProcessingException e) {
            p.authorPartJson = "[]";
        }
        p.authorMemberId = authorMemberId;
        p.thumbnailUrl = thumbnailUrl;
        LocalDateTime now = LocalDateTime.now();
        p.status = PostStatus.PUBLISHED;
        p.publishedAt = now;
        p.createdAt = now;
        p.updatedAt = now;
        return p;
    }

    public void replace(String title, String summary, String content, String thumbnailUrl) {
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.thumbnailUrl = thumbnailUrl;
        this.updatedAt = LocalDateTime.now();
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
