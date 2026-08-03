package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.ContentImpactAnalyticsResponse;
import likelion.khu.website.feed.post.PostRepository;
import likelion.khu.website.project.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContentImpactAnalyticsService {

    private static final int TARGET_COMPARISON_DAYS = 7;
    private static final long MAX_RANGE_DAYS = 731;

    private final AnalyticsPageViewRepository pageViewRepository;
    private final PostRepository postRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public ContentImpactAnalyticsResponse summarize(LocalDate from, LocalDate to,
                                                    AnalyticsContentType selectedType, Long selectedId) {
        validateRange(from, to);
        LocalDate today = LocalDate.now(AnalyticsPageViewService.ANALYTICS_ZONE);
        List<ContentImpactAnalyticsResponse.ContentSummary> contents = loadContents().stream()
                .filter(content -> {
                    LocalDate publishedDate = content.publishedAt().toLocalDate();
                    return !publishedDate.isBefore(from) && !publishedDate.isAfter(to) && !publishedDate.isAfter(today);
                })
                .sorted(Comparator.comparing(ContentImpactAnalyticsResponse.ContentSummary::publishedAt).reversed())
                .toList();

        ContentImpactAnalyticsResponse.ContentSummary selected = selectContent(contents, selectedType, selectedId);
        ContentImpactAnalyticsResponse.Comparison comparison = selected == null
                ? null
                : compare(selected, today);

        return new ContentImpactAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, "day", AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                contents,
                comparison
        );
    }

    private List<ContentImpactAnalyticsResponse.ContentSummary> loadContents() {
        List<ContentImpactAnalyticsResponse.ContentSummary> contents = new ArrayList<>();
        postRepository.findAll().stream()
                .filter(post -> post.getPublishedAt() != null)
                .map(post -> new ContentImpactAnalyticsResponse.ContentSummary(
                        AnalyticsContentType.BLOG_POST, post.getId(), post.getTitle(), post.getPublishedAt()))
                .forEach(contents::add);
        projectRepository.findAll().stream()
                .map(project -> new ContentImpactAnalyticsResponse.ContentSummary(
                        AnalyticsContentType.PROJECT, project.getId(), project.getTitle(), project.getCreatedAt()))
                .forEach(contents::add);
        return contents;
    }

    private ContentImpactAnalyticsResponse.ContentSummary selectContent(
            List<ContentImpactAnalyticsResponse.ContentSummary> contents,
            AnalyticsContentType selectedType,
            Long selectedId) {
        if (selectedType == null && selectedId == null) return contents.stream().findFirst().orElse(null);
        if (selectedType == null || selectedId == null) {
            throw new IllegalStateException("비교할 콘텐츠를 다시 선택해주세요.");
        }
        return contents.stream()
                .filter(content -> content.type() == selectedType && content.id() == selectedId)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("선택 기간에서 비교할 콘텐츠를 찾지 못했어요."));
    }

    private ContentImpactAnalyticsResponse.Comparison compare(
            ContentImpactAnalyticsResponse.ContentSummary content, LocalDate today) {
        LocalDate publishedDate = content.publishedAt().toLocalDate();
        int availableDays = (int) Math.min(
                TARGET_COMPARISON_DAYS, ChronoUnit.DAYS.between(publishedDate, today) + 1);
        int comparisonDays = Math.max(1, availableDays);
        LocalDate beforeFrom = publishedDate.minusDays(comparisonDays);
        LocalDate beforeTo = publishedDate.minusDays(1);
        LocalDate afterFrom = publishedDate;
        LocalDate afterTo = publishedDate.plusDays(comparisonDays - 1L);

        List<AnalyticsPageView> views = pageViewRepository
                .findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(
                        beforeFrom.atStartOfDay(), afterTo.plusDays(1).atStartOfDay());
        long beforeViews = views.stream()
                .filter(view -> view.getOccurredAt().toLocalDate().isBefore(publishedDate))
                .count();
        long afterViews = views.size() - beforeViews;
        long contentViewsAfter = views.stream()
                .filter(view -> view.getContentType() == content.type())
                .filter(view -> content.id() == (view.getContentId() == null ? -1L : view.getContentId()))
                .filter(view -> !view.getOccurredAt().toLocalDate().isBefore(publishedDate))
                .count();

        Map<LocalDate, Long> siteCounts = views.stream().collect(Collectors.groupingBy(
                view -> view.getOccurredAt().toLocalDate(), LinkedHashMap::new, Collectors.counting()));
        Map<LocalDate, Long> contentCounts = views.stream()
                .filter(view -> view.getContentType() == content.type())
                .filter(view -> content.id() == (view.getContentId() == null ? -1L : view.getContentId()))
                .collect(Collectors.groupingBy(
                        view -> view.getOccurredAt().toLocalDate(), LinkedHashMap::new, Collectors.counting()));
        List<ContentImpactAnalyticsResponse.TimePoint> series = new ArrayList<>();
        for (LocalDate cursor = beforeFrom; !cursor.isAfter(afterTo); cursor = cursor.plusDays(1)) {
            series.add(new ContentImpactAnalyticsResponse.TimePoint(
                    cursor, siteCounts.getOrDefault(cursor, 0L), contentCounts.getOrDefault(cursor, 0L)));
        }

        return new ContentImpactAnalyticsResponse.Comparison(
                content,
                comparisonDays,
                comparisonDays == TARGET_COMPARISON_DAYS,
                new ContentImpactAnalyticsResponse.PeriodTotal(beforeFrom, beforeTo, beforeViews),
                new ContentImpactAnalyticsResponse.PeriodTotal(afterFrom, afterTo, afterViews),
                contentViewsAfter,
                series
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
