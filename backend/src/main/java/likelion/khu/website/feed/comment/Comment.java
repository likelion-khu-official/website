package likelion.khu.website.feed.comment;

import likelion.khu.website.feed.post.Post;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Getter
@NoArgsConstructor
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false, columnDefinition = "bigint")
    private Post post;

    private String nickname;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private boolean hidden = false;

    @Column(length = 64)
    private String anonymousActorId;

    @Column(length = 64)
    private String ipHash;

    @Column(length = 100)
    private String userAgent;

    private LocalDateTime hiddenAt;

    private Long hiddenByAdminId;

    @Column(length = 300)
    private String hiddenReason;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static Comment create(Post post, String nickname, String content,
                                 String anonymousActorId, String ipHash, String userAgent) {
        Comment c = new Comment();
        c.post = post;
        c.nickname = nickname;
        c.content = content;
        c.anonymousActorId = anonymousActorId;
        c.ipHash = ipHash;
        c.userAgent = userAgent;
        c.createdAt = LocalDateTime.now();
        return c;
    }

    public void updateVisibility(boolean hidden, Long adminId, String reason) {
        this.hidden = hidden;
        this.hiddenAt = hidden ? LocalDateTime.now() : null;
        this.hiddenByAdminId = hidden ? adminId : null;
        this.hiddenReason = hidden ? reason : null;
    }

}
