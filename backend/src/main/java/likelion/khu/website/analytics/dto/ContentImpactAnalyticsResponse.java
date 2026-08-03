package likelion.khu.website.analytics.dto;

import likelion.khu.website.analytics.AnalyticsContentType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ContentImpactAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        List<ContentSummary> contents,
        Comparison comparison
) {
    public record ContentSummary(
            AnalyticsContentType type,
            long id,
            String title,
            LocalDateTime publishedAt
    ) {
    }

    public record Comparison(
            ContentSummary content,
            int comparisonDays,
            boolean complete,
            PeriodTotal before,
            PeriodTotal after,
            long contentViewsAfter,
            List<TimePoint> series
    ) {
    }

    public record PeriodTotal(LocalDate from, LocalDate to, long siteViews) {
    }

    public record TimePoint(LocalDate date, long siteViews, long contentViews) {
    }
}
