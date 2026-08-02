package likelion.khu.website.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "analytics_page_views")
@Getter
@NoArgsConstructor
public class AnalyticsPageView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    // 쿼리스트링을 제거하고 정규화한 공개 경로만 저장한다. 전체 URL·referrer·사용자 입력은 저장하지 않는다.
    @Column(length = 512, nullable = false)
    private String path;

    // 서버 기준 KST 시각. 집계 API의 기간 경계도 KST 자정으로 맞춘다.
    @Column(nullable = false)
    private LocalDateTime occurredAt;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(length = 32)
    private AnalyticsContentType contentType;

    private Long contentId;

    AnalyticsPageView(String path, LocalDateTime occurredAt) {
        this(path, occurredAt, null, null);
    }

    AnalyticsPageView(String path, LocalDateTime occurredAt, AnalyticsContentType contentType, Long contentId) {
        this.path = path;
        this.occurredAt = occurredAt;
        this.contentType = contentType;
        this.contentId = contentId;
    }
}
