package likelion.khu.website.notification;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSubscriptionRepository extends JpaRepository<NotificationSubscription, Long> {
    boolean existsByEmail(String email);
}
