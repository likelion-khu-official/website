package likelion.khu.website.notification;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "notification_subscriptions")
@Getter
@NoArgsConstructor
public class NotificationSubscription {

    // NotificationSignupAnalyticsService가 이 값을 그대로(zone 변환 없이) "오늘" 범위와 비교하므로
    // AnalyticsPageView와 같은 관례로 Seoul 벽시계 값을 저장한다. JVM 기본 타임존(UTC, 서버·컨테이너에
    // TZ 설정 없음)으로 저장하면 UTC 15~24시(=Seoul 자정 이후) 구간에 가입한 건이 하루 전 날짜로
    // 집계돼 CI에서 간헐적으로 실패했다(NotificationSignupAnalyticsIntegrationTest).
    private static final ZoneId SUBSCRIPTION_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public NotificationSubscription(String email) {
        this.email = email;
        this.createdAt = LocalDateTime.now(SUBSCRIPTION_ZONE);
    }
}
