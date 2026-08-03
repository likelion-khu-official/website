package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.AnalyticsPageViewResponse;
import likelion.khu.website.analytics.dto.BlogAnalyticsResponse;
import likelion.khu.website.feed.post.Post;
import likelion.khu.website.feed.post.PostRepository;
import likelion.khu.website.feed.post.PostStatus;
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
public class BlogAnalyticsService {

    private static final long MAX_RANGE_DAYS = 731;

    private final AnalyticsPageViewRepository pageViewRepository;
    private final PostRepository postRepository;

    @Transactional(readOnly = true)
    public BlogAnalyticsResponse summarize(LocalDate from, LocalDate to, AnalyticsInterval interval,
                                           Long selectedPostId) {
        validateRange(from, to);
        LocalDateTime fromTime = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();

        List<AnalyticsPageView> views = selectedPostId == null
                ? pageViewRepository
                        .findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanAndContentTypeOrderByOccurredAtAsc(
                                fromTime, toExclusive, AnalyticsContentType.BLOG_POST)
                : pageViewRepository
                        .findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanAndContentTypeAndContentIdOrderByOccurredAtAsc(
                                fromTime, toExclusive, AnalyticsContentType.BLOG_POST, selectedPostId);

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
                .countByContent(fromTime, toExclusive, AnalyticsContentType.BLOG_POST).stream()
                .collect(Collectors.toMap(
                        AnalyticsPageViewRepository.ContentViewCount::getContentId,
                        AnalyticsPageViewRepository.ContentViewCount::getViews
                ));

        List<BlogAnalyticsResponse.PostTotal> posts = postRepository.findAll().stream()
                .filter(post -> post.getStatus() == PostStatus.PUBLISHED || post.getStatus() == PostStatus.HIDDEN)
                .map(post -> toTotal(post, totals.getOrDefault(post.getId(), 0L)))
                .sorted(Comparator.comparingLong(BlogAnalyticsResponse.PostTotal::views).reversed()
                        .thenComparing(BlogAnalyticsResponse.PostTotal::publishedAt,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        return new BlogAnalyticsResponse(
                new AnalyticsPageViewResponse.DateRange(
                        from, to, interval.value(), AnalyticsPageViewService.ANALYTICS_ZONE.getId()),
                views.size(),
                series,
                posts
        );
    }

    private BlogAnalyticsResponse.PostTotal toTotal(Post post, long views) {
        return new BlogAnalyticsResponse.PostTotal(
                post.getId(), post.getSlug(), post.getTitle(), post.getStatus(), post.getPublishedAt(), views);
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

