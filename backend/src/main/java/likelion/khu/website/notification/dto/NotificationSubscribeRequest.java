package likelion.khu.website.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class NotificationSubscribeRequest {
    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "유효하지 않은 이메일 형식이에요.")
    private String email;

    // 개인정보 수집·이용 동의(#68). 서버가 동의(true) 없는 구독을 거부하므로(NotificationSubscriptionService),
    // 클라이언트 체크박스가 우회되더라도 동의 없는 저장이 생기지 않는다 — 지원폼(#152)과 같은 방식.
    private boolean privacyConsent;

    // 봇 함정 필드(honeypot, #69). 화면에서 숨겨져 사람은 늘 빈 값으로 보낸다. 값이 차 있으면
    // 자동 제출(봇)로 보고 서버가 조용히 무시한다(NotificationSubscriptionService). 외부 캡차 의존성 없이
    // 순진한 봇을 걸러내는 최소 장치 — 실제 남용이 관측되면 캡차/rate-limit로 격상(PR 설명 참고).
    private String website;
}
