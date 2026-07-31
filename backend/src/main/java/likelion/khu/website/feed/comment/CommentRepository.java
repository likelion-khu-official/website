package likelion.khu.website.feed.comment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPostIdOrderByCreatedAtAsc(Long postId);
    List<Comment> findAllByOrderByCreatedAtDesc();
    long countByPostIdAndHiddenFalse(Long postId);
    void deleteAllByPostId(Long postId);

    @Modifying
    @Query("""
            update Comment comment
               set comment.anonymousActorId = null,
                   comment.ipHash = null,
                   comment.userAgent = null
             where comment.createdAt < :cutoff
               and (comment.anonymousActorId is not null
                    or comment.ipHash is not null
                    or comment.userAgent is not null)
            """)
    int clearTrackingSignalsCreatedBefore(LocalDateTime cutoff);
}
