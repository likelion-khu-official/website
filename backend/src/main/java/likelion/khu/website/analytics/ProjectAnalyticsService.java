package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.ProjectAnalyticsResponse;
import likelion.khu.website.project.Project;
import likelion.khu.website.project.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectAnalyticsService {

    private static final long MAX_RANGE_DAYS = 731;

    private final AnalyticsPageViewRepository pageViewRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public ProjectAnalyticsResponse summarize(LocalDate from, LocalDate to, AnalyticsInterval interval,
                                              Long selectedProjectId) {
        validateRange(from, to);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();
        List<AnalyticsPageView> views = selectedProjectId == null
                ? pageViewRepository
                        .findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanAndContentTypeOrderByOccurredAtAsc(
                                fromTime, toExclusive, AnalyticsContentType.PROJECT)
                : pageViewRepository
                        .findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanAndContentTypeAndContentIdOrderByOccurredAtAsc(
                                fromTime, toExclusive, AnalyticsContentType.PROJECT, selectedProjectId);

        Map<LocalDate, Long> counts = views.stream().collect(Collectors.groupingBy(
                view -> interval.bucketStart(view.getOccurredAt().toLocalDate()),
                LinkedHashMap::new,
                Collectors.counting()
        ));
        List<AnalyticsPageViewResponse.TimePoint> series = new ArrayList<>();
        LocalDate lastBucket = interval.bucketStart(to);
        for (LocalDate cursor = interval.bucketStart(from); !cursor.isAfter(lastBucket); cursor = interval.next(cursor)) {
            series.add(new AnalyticsPageViewResponse.TimePoint(cursor, counts.getOrDefault(cursor, 0L)));
        }

        Map<Long, Long> totals = pageViewRepository
                .countByContent(fromTime, toExclusive, AnalyticsContentType.PROJECT).stream()
                .collect(Collectors.toMap(
                        AnalyticsPageViewRepository.ContentViewCount::getContentId,
                        AnalyticsPageViewRepository.ContentViewCount::getViews
                ));
        List<ProjectAnalyticsResponse.ProjectTotal> projects = projectRepository.findAll().stream()
                .map(project -> toTotal(project, totals.getOrDefault(project.getId(), 0L)))
                .sorted(Comparator.comparingLong(ProjectAnalyticsResponse.ProjectTotal::views).reversed()
                        .thenComparing(ProjectAnalyticsResponse.ProjectTotal::createdAt,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        return new ProjectAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, interval.value(), AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                views.size(), series, projects);
    }

    private ProjectAnalyticsResponse.ProjectTotal toTotal(Project project, long views) {
        return new ProjectAnalyticsResponse.ProjectTotal(
                project.getId(), project.getTitle(), project.getCohort(), project.isHidden(),
                project.getCreatedAt(), views);
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
