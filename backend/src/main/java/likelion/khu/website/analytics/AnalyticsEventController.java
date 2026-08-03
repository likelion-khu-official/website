package likelion.khu.website.analytics;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import likelion.khu.website.analytics.dto.AnalyticsEventTrackRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AnalyticsEventController {

    private final AnalyticsEventService service;

    @PostMapping("/api/analytics/events")
    public ResponseEntity<Void> track(@Valid @RequestBody AnalyticsEventTrackRequest body,
                                      HttpServletRequest request) {
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        String host = forwardedHost == null || forwardedHost.isBlank()
                ? request.getHeader("Host")
                : forwardedHost;
        service.record(body, host, request.getHeader("User-Agent"));
        return ResponseEntity.noContent().build();
    }
}
