package likelion.khu.website.analytics.dto;

import java.time.LocalDate;
import java.util.List;

public record VisitorAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        long uniqueVisitors,
        List<TimePoint> series
) {
    public record TimePoint(LocalDate date, long visitors) {
    }
}
