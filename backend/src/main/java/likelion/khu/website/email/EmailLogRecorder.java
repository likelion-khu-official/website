package likelion.khu.website.email;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

// EmailService.send()가 어떤 트랜잭션 안에서 호출되는지는 호출자 마음이라 EmailService 스스로는 통제할 수 없다
// (지금은 호출자가 없어 안 드러나지만, #74가 @Transactional 메서드 안에서 이메일을 보내면 그 트랜잭션의 일부가 됨).
// 그 트랜잭션이 이메일 발송 이후 다른 이유로 롤백되면 email_log에 방금 적은 성공/실패 기록도 함께 사라진다 —
// "발송 결과는 무조건 email_log에 남아야 한다"는 불변식이 호출자 트랜잭션 경계에 종속되면 안 됨(#85 리뷰, 신선우).
// REQUIRES_NEW로 항상 별도의 새 트랜잭션을 열어 즉시 커밋되게 해서, 바깥 트랜잭션의 운명과 분리한다.
// 같은 클래스 안(EmailService)에서 이 메서드를 호출하면 self-invocation이라 프록시를 안 거쳐 @Transactional이
// 무시되므로, 반드시 별도 빈으로 분리해야 함 — 그래서 EmailService가 아니라 이 클래스에 둔다.
@Component
@RequiredArgsConstructor
class EmailLogRecorder {

    private final EmailLogRepository emailLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void recordSuccess(String recipient, EmailType type, String subject, String messageId) {
        emailLogRepository.save(EmailLog.success(recipient, type, subject, messageId));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void recordFailure(String recipient, EmailType type, String subject, String errorMessage, String messageId) {
        emailLogRepository.save(EmailLog.failure(recipient, type, subject, errorMessage, messageId));
    }
}
