package likelion.khu.website.feed.comment;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "comment_moderation_events")
@Getter
@NoArgsConstructor
public class CommentModerationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    private Comment comment;

    @Column(nullable = false, length = 20)
    private String action;

    @Column(nullable = false)
    private Long adminId;

    @Column(length = 300)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static CommentModerationEvent create(
            Comment comment, boolean hidden, Long adminId, String reason) {
        CommentModerationEvent event = new CommentModerationEvent();
        event.comment = comment;
        event.action = hidden ? "HIDE" : "RESTORE";
        event.adminId = adminId;
        event.reason = reason;
        event.createdAt = LocalDateTime.now();
        return event;
    }
}
