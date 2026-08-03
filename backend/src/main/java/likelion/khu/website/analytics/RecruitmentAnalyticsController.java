package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.RecruitmentAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class RecruitmentAnalyticsController {

    private final RecruitmentAnalyticsService service;

    @GetMapping("/api/admin/analytics/recruitment")
    @PreAuthorize("hasRole('ADMIN')")
    public RecruitmentAnalyticsResponse summarize() {
        return service.summarize();
    }
}
