package likelion.khu.website.email;

import likelion.khu.website.email.exception.EmailSendException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * #74(어드민 초대)가 붙었을 때 생길 법한 호출 형태 — {@code @Transactional} 메서드 안에서
 * EmailService를 호출하는 것 — 를 흉내 내는 테스트 전용 협력자.
 * email_log 기록이 이 바깥 트랜잭션의 운명(롤백)과 무관하게 살아남는지 검증하는 데 씀
 * (왜 필요한지는 EmailService.recordSuccess() 주석 및 EmailLogEventListener 참고 — #85 리뷰, 신선우).
 */
@Component
@RequiredArgsConstructor
class TransactionalEmailInviter {

    private final EmailService emailService;

    /** #74가 실제로 배포되면 가장 흔할 경로 — 롤백 없이 정상적으로 커밋된다. */
    @Transactional
    void inviteAndCommit(String to, String inviteUrl, LocalDateTime expiresAt) {
        emailService.sendInviteEmail(to, inviteUrl, expiresAt);
    }

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

    /**
     * 발송은 실패했지만, 호출자가 예외를 삼키고("나중에 재발송하면 된다") 트랜잭션은 그대로
     * 정상 커밋되는 경우. inviteAndPropagateFailure()와 달리 여기선 롤백이 안 일어난다 — 그래도
     * 실패 로그가 남는지가 별개로 확인돼야 하는 경우의 수(신선우 리뷰에서 다룬 시나리오와는
     * 다른 조합).
     */
    @Transactional
    void inviteAndSwallowFailure(String to, String inviteUrl, LocalDateTime expiresAt) {
        try {
            emailService.sendInviteEmail(to, inviteUrl, expiresAt);
        } catch (EmailSendException e) {
            // 의도적으로 무시 — 트랜잭션은 롤백 없이 그대로 커밋되게 둠
        }
    }
}
