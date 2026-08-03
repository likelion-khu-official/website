package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.PopularTimeAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class PopularTimeAnalyticsService {

    private static final long MAX_RANGE_DAYS = 731;
    private final AnalyticsPageViewRepository repository;

    @Transactional(readOnly = true)
    public PopularTimeAnalyticsResponse summarize(LocalDate from, LocalDate to) {
        validateRange(from, to);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();
        List<AnalyticsPageView> views = repository
                .findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(fromTime, toExclusive);

        long[] hourCounts = new long[24];
        Map<DayOfWeek, Long> weekdayCounts = new EnumMap<>(DayOfWeek.class);
        views.forEach(view -> {
            hourCounts[view.getOccurredAt().getHour()]++;
            weekdayCounts.merge(view.getOccurredAt().getDayOfWeek(), 1L, Long::sum);
        });

        List<PopularTimeAnalyticsResponse.HourTotal> hours = IntStream.range(0, 24)
                .mapToObj(hour -> new PopularTimeAnalyticsResponse.HourTotal(hour, hourCounts[hour]))
                .toList();
        List<PopularTimeAnalyticsResponse.WeekdayTotal> weekdays = Arrays.stream(DayOfWeek.values())
                .map(day -> new PopularTimeAnalyticsResponse.WeekdayTotal(
                        day, weekdayCounts.getOrDefault(day, 0L)))
                .toList();

        return new PopularTimeAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, "all", AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                views.size(),
                hours,
                weekdays
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
