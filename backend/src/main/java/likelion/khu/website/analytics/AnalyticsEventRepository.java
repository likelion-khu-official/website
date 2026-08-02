package likelion.khu.website.analytics;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {
    boolean existsByDeduplicationKey(String deduplicationKey);

    List<AnalyticsEvent> findAllByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
            AnalyticsEventType eventType, LocalDateTime from, LocalDateTime toExclusive);
}
