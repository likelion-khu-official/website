package likelion.khu.website.analytics.dto;

import java.time.DayOfWeek;
import java.util.List;

public record PopularTimeAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        long totalViews,
        List<HourTotal> hours,
        List<WeekdayTotal> weekdays
) {
    public record HourTotal(int hour, long views) {
    }

    public record WeekdayTotal(DayOfWeek day, long views) {
    }
}
