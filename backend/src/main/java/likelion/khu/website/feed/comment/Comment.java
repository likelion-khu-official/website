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

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static Comment create(Post post, String nickname, String content) {
        Comment c = new Comment();
        c.post = post;
        c.nickname = nickname;
        c.content = content;
        c.createdAt = LocalDateTime.now();
        return c;
    }

    public void hide() {
        this.hidden = true;
    }
}
