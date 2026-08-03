package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.ContentImpactAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class ContentImpactAnalyticsController {

    private final ContentImpactAnalyticsService service;

    @GetMapping("/api/admin/analytics/content-impact")
    @PreAuthorize("hasRole('ADMIN')")
    public ContentImpactAnalyticsResponse summarize(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) AnalyticsContentType type,
            @RequestParam(required = false) Long id) {
        return service.summarize(from, to, type, id);
    }
}
