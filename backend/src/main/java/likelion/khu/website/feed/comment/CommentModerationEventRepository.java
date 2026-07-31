package likelion.khu.website.feed.comment;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentModerationEventRepository
        extends JpaRepository<CommentModerationEvent, Long> {
}
