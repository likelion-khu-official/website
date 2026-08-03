package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.SectionReachAnalyticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SectionReachAnalyticsService {

    private static final long MAX_RANGE_DAYS = 731;
    private final AnalyticsEventRepository repository;

    @Transactional(readOnly = true)
    public SectionReachAnalyticsResponse summarize(LocalDate from, LocalDate to) {
        validateRange(from, to);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();
        Map<LandingSection, Long> counts = new EnumMap<>(LandingSection.class);
        repository.findAllByEventTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
                        AnalyticsEventType.SECTION_REACH, fromTime, toExclusive)
                .forEach(event -> counts.merge(LandingSection.valueOf(event.getEventKey()), 1L, Long::sum));

        List<SectionReachAnalyticsResponse.SectionTotal> sections = Arrays.stream(LandingSection.values())
                .map(section -> new SectionReachAnalyticsResponse.SectionTotal(
                        section, counts.getOrDefault(section, 0L)))
                .toList();
        return new SectionReachAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, "all", AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                sections
        );
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
