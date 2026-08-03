package likelion.khu.website.analytics.dto;

import java.time.LocalDate;
import java.util.List;

public record AnalyticsPageViewResponse(
        DateRange range,
        long totalViews,
        List<TimePoint> series,
        List<PageTotal> pages
) {
    public record DateRange(LocalDate from, LocalDate to, String interval, String timezone) {
    }

    public record TimePoint(LocalDate date, long views) {
    }

    public record PageTotal(String path, long views) {
    }
}

