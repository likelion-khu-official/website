package likelion.khu.website.analytics;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AnalyticsPageViewRepository extends JpaRepository<AnalyticsPageView, Long> {

    List<AnalyticsPageView> findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(
            LocalDateTime from, LocalDateTime toExclusive);

    List<AnalyticsPageView> findAllByOccurredAtGreaterThanEqualAndOccurredAtLessThanAndPathOrderByOccurredAtAsc(
            LocalDateTime from, LocalDateTime toExclusive, String path);

    @Query("""
            select v.path as path, count(v) as views
            from AnalyticsPageView v
            where v.occurredAt >= :from and v.occurredAt < :toExclusive
            group by v.path
            order by count(v) desc, v.path asc
            """)
    List<PageViewCount> countByPath(@Param("from") LocalDateTime from,
                                    @Param("toExclusive") LocalDateTime toExclusive);

    interface PageViewCount {
        String getPath();
        long getViews();
    }
}

