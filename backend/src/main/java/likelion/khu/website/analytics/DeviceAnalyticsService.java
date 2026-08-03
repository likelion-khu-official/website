package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.DeviceAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DeviceAnalyticsService {

    private static final long MAX_RANGE_DAYS = 731;

    private final AnalyticsPageViewRepository repository;

    @Transactional(readOnly = true)
    public DeviceAnalyticsResponse summarize(LocalDate from, LocalDate to) {
        validateRange(from, to);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();
        List<AnalyticsPageView> views = repository
                .findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(fromTime, toExclusive);
        Map<AnalyticsDeviceType, Long> counts = new EnumMap<>(AnalyticsDeviceType.class);
        for (AnalyticsPageView view : views) {
            counts.merge(view.getDeviceType(), 1L, Long::sum);
        }

        long total = views.size();
        Map<AnalyticsDeviceType, Integer> percentageTenths = allocatePercentageTenths(counts, total);
        List<DeviceAnalyticsResponse.DeviceTotal> devices = Arrays.stream(AnalyticsDeviceType.values())
                .map(device -> {
                    long count = counts.getOrDefault(device, 0L);
                    BigDecimal percentage = BigDecimal.valueOf(percentageTenths.getOrDefault(device, 0), 1);
                    return new DeviceAnalyticsResponse.DeviceTotal(device, count, percentage);
                })
                .toList();

        return new DeviceAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, "all", AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                total,
                devices
        );
    }

    // 소수 첫째 자리에서 각각 반올림하면 99.9%가 될 수 있어, 최대 나머지 방식으로 합을 100.0%에 맞춘다.
    private Map<AnalyticsDeviceType, Integer> allocatePercentageTenths(
            Map<AnalyticsDeviceType, Long> counts, long total) {
        Map<AnalyticsDeviceType, Integer> result = new EnumMap<>(AnalyticsDeviceType.class);
        if (total == 0) return result;

        int allocated = 0;
        for (AnalyticsDeviceType device : AnalyticsDeviceType.values()) {
            int tenths = (int) (counts.getOrDefault(device, 0L) * 1000L / total);
            result.put(device, tenths);
            allocated += tenths;
        }
        List<AnalyticsDeviceType> remainderOrder = Arrays.stream(AnalyticsDeviceType.values())
                .sorted(Comparator
                        .comparingLong((AnalyticsDeviceType device) ->
                                counts.getOrDefault(device, 0L) * 1000L % total)
                        .reversed()
                        .thenComparingInt(Enum::ordinal))
                .toList();
        for (int index = 0; index < 1000 - allocated; index++) {
            AnalyticsDeviceType device = remainderOrder.get(index % remainderOrder.size());
            result.merge(device, 1, Integer::sum);
        }
        return result;
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new IllegalStateException("확인할 시작일과 종료일을 다시 선택해주세요.");
        }
        if (from.plusDays(MAX_RANGE_DAYS).isBefore(to)) {
            throw new IllegalStateException("한 번에 최대 2년까지 조회할 수 있어요.");
        }
    }
}
