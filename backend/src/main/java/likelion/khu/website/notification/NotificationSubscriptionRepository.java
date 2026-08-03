package likelion.khu.website.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.LocalDateTime;

public interface NotificationSubscriptionRepository extends JpaRepository<NotificationSubscription, Long> {
    boolean existsByEmail(String email);
    List<NotificationSubscription> findAllByOrderByCreatedAtDesc();
    List<NotificationSubscription> findAllByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
            LocalDateTime from, LocalDateTime toExclusive);
}
