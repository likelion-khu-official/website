package likelion.khu.website.analytics;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.PageViewTrackRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class AnalyticsPageViewController {

    private final AnalyticsPageViewService service;

    @PostMapping("/api/analytics/pageviews")
    public ResponseEntity<Void> track(@Valid @RequestBody PageViewTrackRequest body,
                                      HttpServletRequest request) {
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        String host = forwardedHost == null || forwardedHost.isBlank()
                ? request.getHeader("Host")
                : forwardedHost;
        service.record(body.path(), body.visitorId(), host, request.getHeader("User-Agent"));
        // 제외된 요청도 같은 응답을 줘 수집 정책을 외부에서 탐색하는 표면을 만들지 않는다.
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/admin/analytics/pageviews")
    @PreAuthorize("hasRole('ADMIN')")
    public AnalyticsPageViewResponse summarize(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String interval,
            @RequestParam(required = false) String page) {
        return service.summarize(from, to, AnalyticsInterval.parse(interval), page);
    }
}
