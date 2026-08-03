package likelion.khu.website.notification;

import likelion.khu.website.application.exception.PrivacyConsentRequiredException;
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
        // 봇 함정(#69) — 화면에서 숨긴 honeypot 필드가 차 있으면 자동 제출로 보고 조용히 무시한다.
        // 사람에게 보이는 응답은 정상 신청과 똑같이 줘서(성공 메시지) 봇에게 걸러졌음을 알리지 않는다.
        if (request.getWebsite() != null && !request.getWebsite().isBlank()) {
            return new NotificationSubscribeResponse(true, "모집 알림을 신청했어요!");
        }

        // 개인정보 수집·이용 동의 없이는 저장하지 않는다(#68). 이 검증을 통과해 만들어진 행은
        // 곧 "동의 하에 수집됐다"는 증적이 되고, createdAt이 그 시각이다 — 지원폼(#152)과 동일.
        if (!request.isPrivacyConsent()) {
            throw new PrivacyConsentRequiredException();
        }

        // 이미 등록됐든 새로 등록했든 사용자에게 보이는 응답은 동일하게 준다(#70, 계정 열거 방지).
        // 예전엔 "이미 등록된 이메일이에요"로 갈려서, 아무 주소나 넣어보는 것만으로 그 주소의
        // 구독 여부를 외부에서 판별할 수 있었다. 저장은 멱등 — 이미 있으면 새로 만들지 않는다.
        if (!repository.existsByEmail(request.getEmail())) {
            repository.save(new NotificationSubscription(request.getEmail()));
        }
        return new NotificationSubscribeResponse(true, "모집 알림을 신청했어요!");
    }
}
