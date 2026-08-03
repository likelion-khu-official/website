package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.KeyClickAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class KeyClickAnalyticsController {

    private final KeyClickAnalyticsService service;

    @GetMapping("/api/admin/analytics/clicks")
    @PreAuthorize("hasRole('ADMIN')")
    public KeyClickAnalyticsResponse summarize(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String interval,
            @RequestParam(required = false) String action) {
        return service.summarize(from, to, AnalyticsInterval.parse(interval), KeyClickAction.parse(action));
    }
}
