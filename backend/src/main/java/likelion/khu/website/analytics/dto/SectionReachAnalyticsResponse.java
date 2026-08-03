package likelion.khu.website.analytics.dto;

import likelion.khu.website.analytics.LandingSection;

import java.util.List;

public record SectionReachAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        List<SectionTotal> sections
) {
    public record SectionTotal(LandingSection section, long reaches) {
    }
}
