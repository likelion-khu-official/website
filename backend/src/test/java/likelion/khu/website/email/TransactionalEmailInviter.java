package likelion.khu.website.email;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * #74(어드민 초대)가 붙었을 때 생길 법한 호출 형태 — {@code @Transactional} 메서드 안에서
 * EmailService를 호출하는 것 — 를 흉내 내는 테스트 전용 협력자.
 * email_log 기록이 이 바깥 트랜잭션의 운명(롤백)과 무관하게 살아남는지 검증하는 데 씀
 * (왜 필요한지는 EmailLogRecorder 클래스 주석 참고 — #85 리뷰, 신선우).
 */
@Component
@RequiredArgsConstructor
class TransactionalEmailInviter {

    private final EmailService emailService;

    /** SMTP 실패로 EmailSendException(unchecked)이 던져지면 이 트랜잭션 전체가 롤백된다. */
    @Transactional
    void inviteAndPropagateFailure(String to, String inviteUrl, LocalDateTime expiresAt) {
        emailService.sendInviteEmail(to, inviteUrl, expiresAt);
    }

    /** 메일 발송 자체는 성공하지만, 그 이후 다른 이유로 트랜잭션이 롤백되는 상황을 흉내낸다(예: 토큰 저장 실패). */
    @Transactional
    void inviteThenFailForUnrelatedReason(String to, String inviteUrl, LocalDateTime expiresAt) {
        emailService.sendInviteEmail(to, inviteUrl, expiresAt);
        throw new IllegalStateException("초대 발급 로직의 다른 단계에서 실패했다고 가정");
    }
}
