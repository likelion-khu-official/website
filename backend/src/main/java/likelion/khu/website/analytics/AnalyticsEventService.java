package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsEventTrackRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsEventService {

    private static final List<String> BOT_MARKERS = List.of(
            "bot", "crawler", "spider", "slurp", "headless", "lighthouse", "preview", "facebookexternalhit"
    );

    private final AnalyticsEventRepository repository;
    private final AnalyticsAnonymousKeyHasher anonymousKeyHasher;

    @Value("${app.analytics.allowed-hosts:likelion-khu.com,www.likelion-khu.com}")
    private String allowedHostsConfig;

    @Transactional
    public void record(AnalyticsEventTrackRequest request, String rawHost, String userAgent) {
        if (!isAllowedHost(rawHost) || isBot(userAgent)) {
            return;
        }
        if (request.key().getEventType() != request.event()) {
            throw new IllegalStateException("이벤트 종류와 대상이 맞지 않아요.");
        }
        String visitKey = anonymousKeyHasher.hash(request.visitId());
        String eventKey = request.key().name();
        String deduplicationKey = request.event() == AnalyticsEventType.SECTION_REACH
                ? anonymousKeyHasher.hash(request.event() + ":" + eventKey + ":" + request.visitId())
                : null;
        if (deduplicationKey != null && repository.existsByDeduplicationKey(deduplicationKey)) {
            return;
        }
        repository.save(new AnalyticsEvent(
                request.event(),
                eventKey,
                anonymousKeyHasher.hash(request.visitorId()),
                visitKey,
                deduplicationKey,
                LocalDateTime.now(AnalyticsPageViewService.ANALYTICS_ZONE)
        ));
    }

    private boolean isAllowedHost(String rawHost) {
        if (rawHost == null || rawHost.isBlank()) return false;
        String host = rawHost.split(",")[0].trim().toLowerCase(Locale.ROOT);
        int portIndex = host.indexOf(':');
        if (portIndex >= 0) host = host.substring(0, portIndex);
        Set<String> allowedHosts = List.of(allowedHostsConfig.split(",")).stream()
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());
        return allowedHosts.contains(host);
    }

    private boolean isBot(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return true;
        String normalized = userAgent.toLowerCase(Locale.ROOT);
        return BOT_MARKERS.stream().anyMatch(normalized::contains);
    }
}
