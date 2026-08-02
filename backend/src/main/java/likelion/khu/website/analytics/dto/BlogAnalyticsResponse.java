package likelion.khu.website.analytics.dto;

import likelion.khu.website.feed.post.PostStatus;

import java.time.LocalDateTime;
import java.util.List;

public record BlogAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        long totalViews,
        List<AnalyticsPageViewResponse.TimePoint> series,
        List<PostTotal> posts
) {
    public record PostTotal(
            long id,
            String slug,
            String title,
            PostStatus status,
            LocalDateTime publishedAt,
            long views
    ) {
    }
}

