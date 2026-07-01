package likelion.khu.website.notification;

import likelion.khu.website.notification.dto.NotificationSubscribeRequest;
import likelion.khu.website.notification.dto.NotificationSubscribeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationSubscriptionService {

    private final NotificationSubscriptionRepository repository;

    @Transactional
    public NotificationSubscribeResponse subscribe(NotificationSubscribeRequest request) {
        if (repository.existsByEmail(request.getEmail())) {
            return new NotificationSubscribeResponse(true, "이미 등록된 이메일이에요.");
        }
        repository.save(new NotificationSubscription(request.getEmail()));
        return new NotificationSubscribeResponse(true, "모집 알림을 신청했어요!");
    }
}
