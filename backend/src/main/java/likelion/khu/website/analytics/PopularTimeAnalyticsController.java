package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.PopularTimeAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class PopularTimeAnalyticsController {

    private final PopularTimeAnalyticsService service;

    @GetMapping("/api/admin/analytics/popular-times")
    @PreAuthorize("hasRole('ADMIN')")
    public PopularTimeAnalyticsResponse summarize(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.summarize(from, to);
    }
}
