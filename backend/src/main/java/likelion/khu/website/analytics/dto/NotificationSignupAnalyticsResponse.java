package likelion.khu.website.analytics.dto;

import java.time.LocalDate;
import java.util.List;

public record NotificationSignupAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        long totalSignups,
        List<TimePoint> series
) {
    public record TimePoint(LocalDate date, long signups) {
    }
}
