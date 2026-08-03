package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.VisitorAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VisitorAnalyticsService {

    private static final long MAX_RANGE_DAYS = 731;

    private final AnalyticsPageViewRepository repository;

    @Transactional(readOnly = true)
    public VisitorAnalyticsResponse summarize(LocalDate from, LocalDate to, AnalyticsInterval interval,
                                              String selectedPath) {
        validateRange(from, to);
        String path = selectedPath == null || selectedPath.isBlank() ? null : normalizePath(selectedPath);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();
        List<AnalyticsPageView> views = path == null
                ? repository.findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(
                        fromTime, toExclusive)
                : repository.findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanAndPathOrderByOccurredAtAsc(
                        fromTime, toExclusive, path);

        Set<String> periodVisitors = new HashSet<>();
        Map<LocalDate, Set<String>> bucketVisitors = new LinkedHashMap<>();
        for (AnalyticsPageView view : views) {
            if (view.getVisitorKey() == null) continue;
            periodVisitors.add(view.getVisitorKey());
            LocalDate bucket = interval.bucketStart(view.getOccurredAt().toLocalDate());
            bucketVisitors.computeIfAbsent(bucket, ignored -> new HashSet<>()).add(view.getVisitorKey());
        }

        List<VisitorAnalyticsResponse.TimePoint> series = new ArrayList<>();
        LocalDate lastBucket = interval.bucketStart(to);
        for (LocalDate cursor = interval.bucketStart(from); !cursor.isAfter(lastBucket); cursor = interval.next(cursor)) {
            series.add(new VisitorAnalyticsResponse.TimePoint(
                    cursor, bucketVisitors.getOrDefault(cursor, Set.of()).size()));
        }
        return new VisitorAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, interval.value(), AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                periodVisitors.size(),
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

    private String normalizePath(String path) {
        String normalized = path.trim();
        if (!normalized.startsWith("/") || normalized.contains("?") || normalized.contains("#")
                || normalized.length() > 512) {
            throw new IllegalStateException("사이트 내부 페이지 경로만 조회할 수 있어요.");
        }
        while (normalized.length() > 1 && normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
