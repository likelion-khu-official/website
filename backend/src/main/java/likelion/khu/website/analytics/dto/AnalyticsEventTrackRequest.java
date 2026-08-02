package likelion.khu.website.analytics.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import likelion.khu.website.analytics.AnalyticsEventType;
import likelion.khu.website.analytics.AnalyticsEventKey;

public record AnalyticsEventTrackRequest(
        @NotNull AnalyticsEventType event,
        @NotNull AnalyticsEventKey key,
        @Pattern(
                regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
                message = "익명 방문자 번호 형식이 올바르지 않아요."
        )
        String visitorId,
        @NotNull
        @Pattern(
                regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
                message = "익명 방문 번호 형식이 올바르지 않아요."
        )
        String visitId
) {
}
