package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsPageViewService {

    static final ZoneId ANALYTICS_ZONE = ZoneId.of("Asia/Seoul");
    private static final long MAX_RANGE_DAYS = 731;
    private static final List<String> EXCLUDED_PREFIXES = List.of("/admin", "/member", "/api");
    private static final List<String> BOT_MARKERS = List.of(
            "bot", "crawler", "spider", "slurp", "headless", "lighthouse", "preview", "facebookexternalhit"
    );

    private final AnalyticsPageViewRepository repository;

    @Value("${app.analytics.allowed-hosts:likelion-khu.com,www.likelion-khu.com}")
    private String allowedHostsConfig;

    @Transactional
    public void record(String rawPath, String rawHost, String userAgent) {
        String path = normalizePath(rawPath);
        if (!isAllowedHost(rawHost) || isExcludedPath(path) || isBot(userAgent)) {
            return;
        }
        repository.save(new AnalyticsPageView(path, LocalDateTime.now(ANALYTICS_ZONE)));
    }

    @Transactional(readOnly = true)
    public AnalyticsPageViewResponse summarize(LocalDate from, LocalDate to, AnalyticsInterval interval,
                                                String selectedPath) {
        validateRange(from, to);
        String path = selectedPath == null || selectedPath.isBlank() ? null : normalizePath(selectedPath);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();

        List<AnalyticsPageView> selectedViews = path == null
                ? repository.findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(
                        fromTime, toExclusive)
                : repository.findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanAndPathOrderByOccurredAtAsc(
                        fromTime, toExclusive, path);

        Map<LocalDate, Long> counts = selectedViews.stream().collect(Collectors.groupingBy(
                view -> interval.bucketStart(view.getOccurredAt().toLocalDate()),
                LinkedHashMap::new,
                Collectors.counting()
        ));

        LocalDate firstBucket = interval.bucketStart(from);
        LocalDate lastBucket = interval.bucketStart(to);
        List<AnalyticsPageViewResponse.TimePoint> series = new ArrayList<>();
        for (LocalDate cursor = firstBucket; !cursor.isAfter(lastBucket); cursor = interval.next(cursor)) {
            series.add(new AnalyticsPageViewResponse.TimePoint(cursor, counts.getOrDefault(cursor, 0L)));
        }

        List<AnalyticsPageViewResponse.PageTotal> pages = repository.countByPath(fromTime, toExclusive).stream()
                .map(row -> new AnalyticsPageViewResponse.PageTotal(row.getPath(), row.getViews()))
                .toList();

        return new AnalyticsPageViewResponse(
                new AnalyticsPageViewResponse.DateRange(from, to, interval.value(), ANALYTICS_ZONE.getId()),
                selectedViews.size(),
                series,
                pages
        );
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalStateException("시작일과 종료일을 모두 선택해주세요.");
        }
        if (from.isAfter(to)) {
            throw new IllegalStateException("시작일은 종료일보다 늦을 수 없어요.");
        }
        if (from.plusDays(MAX_RANGE_DAYS).isBefore(to)) {
            throw new IllegalStateException("한 번에 최대 2년까지 조회할 수 있어요.");
        }
    }

    private String normalizePath(String rawPath) {
        String path = rawPath == null ? "/" : rawPath.trim();
        int queryIndex = path.indexOf('?');
        if (queryIndex >= 0) path = path.substring(0, queryIndex);
        int hashIndex = path.indexOf('#');
        if (hashIndex >= 0) path = path.substring(0, hashIndex);
        if (!path.startsWith("/")) {
            throw new IllegalStateException("사이트 내부 페이지 경로만 조회할 수 있어요.");
        }
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        if (path.length() > 512) {
            throw new IllegalStateException("페이지 경로가 너무 길어요.");
        }
        return path;
    }

    private boolean isAllowedHost(String rawHost) {
        if (rawHost == null || rawHost.isBlank()) return false;
        String host = rawHost.split(",")[0].trim().toLowerCase(Locale.ROOT);
        if (host.startsWith("[")) {
            int closingBracket = host.indexOf(']');
            if (closingBracket >= 0) host = host.substring(1, closingBracket);
        } else {
            int portIndex = host.indexOf(':');
            if (portIndex >= 0) host = host.substring(0, portIndex);
        }
        Set<String> allowedHosts = List.of(allowedHostsConfig.split(",")).stream()
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());
        return allowedHosts.contains(host);
    }

    private boolean isExcludedPath(String path) {
        return EXCLUDED_PREFIXES.stream().anyMatch(prefix -> path.equals(prefix) || path.startsWith(prefix + "/"));
    }

    private boolean isBot(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return true;
        String normalized = userAgent.toLowerCase(Locale.ROOT);
        return BOT_MARKERS.stream().anyMatch(normalized::contains);
    }
}

