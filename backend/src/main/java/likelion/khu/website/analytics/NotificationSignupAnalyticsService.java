package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.NotificationSignupAnalyticsResponse;
import likelion.khu.website.notification.NotificationSubscription;
import likelion.khu.website.notification.NotificationSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationSignupAnalyticsService {

    private static final long MAX_RANGE_DAYS = 731;
    private final NotificationSubscriptionRepository repository;

    @Transactional(readOnly = true)
    public NotificationSignupAnalyticsResponse summarize(LocalDate from, LocalDate to, AnalyticsInterval interval) {
        validateRange(from, to);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();
        List<NotificationSubscription> subscriptions = repository
                .findAllByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(fromTime, toExclusive);
        Map<LocalDate, Long> counts = subscriptions.stream().collect(Collectors.groupingBy(
                subscription -> interval.bucketStart(subscription.getCreatedAt().toLocalDate()),
                LinkedHashMap::new,
                Collectors.counting()
        ));

        List<NotificationSignupAnalyticsResponse.TimePoint> series = new ArrayList<>();
        for (LocalDate cursor = interval.bucketStart(from);
             !cursor.isAfter(interval.bucketStart(to)); cursor = interval.next(cursor)) {
            series.add(new NotificationSignupAnalyticsResponse.TimePoint(cursor, counts.getOrDefault(cursor, 0L)));
        }

        return new NotificationSignupAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, interval.value(), AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                subscriptions.size(),
                series
        );
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new IllegalStateException("확인할 시작일과 종료일을 다시 선택해주세요.");
        }
        if (from.plusDays(MAX_RANGE_DAYS).isBefore(to)) {
            throw new IllegalStateException("한 번에 최대 2년까지 조회할 수 있어요.");
        }
    }
}
