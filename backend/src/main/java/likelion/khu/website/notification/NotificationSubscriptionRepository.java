package likelion.khu.website.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationSubscriptionRepository extends JpaRepository<NotificationSubscription, Long> {
    boolean existsByEmail(String email);
    List<NotificationSubscription> findAllByOrderByCreatedAtDesc();
}
