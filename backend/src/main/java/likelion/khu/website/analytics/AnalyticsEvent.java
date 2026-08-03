package likelion.khu.website.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "analytics_events")
@Getter
@NoArgsConstructor
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false)
    private AnalyticsEventType eventType;

    @Column(length = 64, nullable = false)
    private String eventKey;

    @Column(length = 64)
    private String visitorKey;

    @Column(length = 64, nullable = false)
    private String visitKey;

    @Column(length = 64, unique = true)
    private String deduplicationKey;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    AnalyticsEvent(AnalyticsEventType eventType, String eventKey, String visitorKey,
                   String visitKey, String deduplicationKey, LocalDateTime occurredAt) {
        this.eventType = eventType;
        this.eventKey = eventKey;
        this.visitorKey = visitorKey;
        this.visitKey = visitKey;
        this.deduplicationKey = deduplicationKey;
        this.occurredAt = occurredAt;
    }
}
