package likelion.khu.website.analytics.dto;

import java.time.LocalDateTime;

public record RecruitmentAnalyticsResponse(
        Long roundId,
        String state,
        LocalDateTime openedAt,
        LocalDateTime closedAt,
        long applicationCount
) {
    public static RecruitmentAnalyticsResponse empty() {
        return new RecruitmentAnalyticsResponse(null, "NONE", null, null, 0);
    }
}
