package likelion.khu.website.recruitment.dto;

import likelion.khu.website.notification.NotificationSubscription;
import lombok.Getter;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class SubscriberSummary {
    private String email;
    private LocalDateTime subscribedAt;

    public static SubscriberSummary from(NotificationSubscription s) {
        return new SubscriberSummary(s.getEmail(), s.getCreatedAt());
    }
}
