package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.KeyClickAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KeyClickAnalyticsService {

    private static final long MAX_RANGE_DAYS = 731;
    private final AnalyticsEventRepository repository;

    @Transactional(readOnly = true)
    public KeyClickAnalyticsResponse summarize(LocalDate from, LocalDate to, AnalyticsInterval interval,
                                               KeyClickAction selectedAction) {
        validateRange(from, to);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();
        List<AnalyticsEvent> selectedEvents = repository
                .findAllByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
                        AnalyticsEventType.KEY_CLICK, fromTime, toExclusive)
                .stream()
                .filter(event -> selectedAction == null
                        || AnalyticsEventKey.valueOf(event.getEventKey()).getAction() == selectedAction)
                .toList();

        Map<LocalDate, Long> timeCounts = selectedEvents.stream().collect(Collectors.groupingBy(
                event -> interval.bucketStart(event.getOccurredAt().toLocalDate()),
                LinkedHashMap::new,
                Collectors.counting()
        ));
        List<KeyClickAnalyticsResponse.TimePoint> series = new ArrayList<>();
        for (LocalDate cursor = interval.bucketStart(from);
             !cursor.isAfter(interval.bucketStart(to)); cursor = interval.next(cursor)) {
            series.add(new KeyClickAnalyticsResponse.TimePoint(cursor, timeCounts.getOrDefault(cursor, 0L)));
        }

        Map<AnalyticsEventKey, Long> keyCounts = selectedEvents.stream().collect(Collectors.groupingBy(
                event -> AnalyticsEventKey.valueOf(event.getEventKey()),
                LinkedHashMap::new,
                Collectors.counting()
        ));
        List<KeyClickAnalyticsResponse.ClickTotal> clicks = Arrays.stream(AnalyticsEventKey.values())
                .filter(key -> key.getEventType() == AnalyticsEventType.KEY_CLICK)
                .filter(key -> selectedAction == null || key.getAction() == selectedAction)
                .map(key -> new KeyClickAnalyticsResponse.ClickTotal(
                        key.getAction(), key.getLocation(), keyCounts.getOrDefault(key, 0L)))
                .toList();

        return new KeyClickAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, interval.value(), AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                selectedEvents.size(),
                series,
                clicks
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
