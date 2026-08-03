package likelion.khu.website.analytics.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ProjectAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        long totalViews,
        List<AnalyticsPageViewResponse.TimePoint> series,
        List<ProjectTotal> projects
) {
    public record ProjectTotal(
            long id,
            String title,
            int cohort,
            boolean hidden,
            LocalDateTime createdAt,
            long views
    ) {
    }
}
