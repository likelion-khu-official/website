package likelion.khu.website.analytics.dto;

import likelion.khu.website.analytics.AnalyticsDeviceType;

import java.math.BigDecimal;
import java.util.List;

public record DeviceAnalyticsResponse(
        AnalyticsPageViewResponse.DateRange range,
        long totalViews,
        List<DeviceTotal> devices
) {
    public record DeviceTotal(
            AnalyticsDeviceType device,
            long views,
            BigDecimal percentage
    ) {
    }
}
