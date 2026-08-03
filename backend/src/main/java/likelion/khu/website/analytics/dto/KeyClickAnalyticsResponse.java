package likelion.khu.website.analytics.dto;

import likelion.khu.website.analytics.KeyClickAction;
import likelion.khu.website.analytics.KeyClickLocation;

import java.time.LocalDate;
import java.util.List;

public record KeyClickAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        long totalClicks,
        List<TimePoint> series,
        List<ClickTotal> clicks
) {
    public record TimePoint(LocalDate date, long clicks) {
    }

    public record ClickTotal(KeyClickAction action, KeyClickLocation location, long clicks) {
    }
}
