package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.DeviceAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class DeviceAnalyticsController {

    private final DeviceAnalyticsService service;

    @GetMapping("/api/admin/analytics/devices")
    @PreAuthorize("hasRole('ADMIN')")
    public DeviceAnalyticsResponse summarize(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.summarize(from, to);
    }
}
