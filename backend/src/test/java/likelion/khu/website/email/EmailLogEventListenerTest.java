package likelion.khu.website.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

/**
 * EmailLogEventListener를 EmailLogEvent.toEmailLog() 변환·저장 로직만 놓고 Docker·Spring
 * 컨텍스트 없이 빠르게 검증한다(무거운 통합테스트는 @Async·@TransactionalEventListener가 실제
 * 트랜잭션 경계에서 제대로 걸리는지가 검증 대상이라 이 클래스와 역할이 겹치지 않음 — 통합 버전은
 * EmailServiceFailureTransactionBoundaryIntegrationTest / EmailServiceIntegrationTest).
 */
class EmailLogEventListenerTest {

    @Mock
    private EmailLogRepository emailLogRepository;

    private EmailLogEventListener listener;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        listener = new EmailLogEventListener(emailLogRepository);
    }

    @Test
    void onEmailLogEvent_SuccessEvent_SavesEmailLogWithSuccessFieldsAndNoErrorMessage() {
        EmailLogEvent event = EmailLogEvent.success(
                "invitee@khu.ac.kr", EmailType.INVITE, EmailType.INVITE.getSubject(), "<msg-id-1>");

        listener.onEmailLogEvent(event);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getRecipient()).isEqualTo("invitee@khu.ac.kr");
        assertThat(log.getEmailType()).isEqualTo(EmailType.INVITE);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.SUCCESS);
        assertThat(log.getErrorMessage()).isNull();
        assertThat(log.getMessageId()).isEqualTo("<msg-id-1>");
    }

    @Test
    void onEmailLogEvent_FailureEvent_SavesEmailLogWithFailureFieldsAndErrorMessage() {
        EmailLogEvent event = EmailLogEvent.failure(
                "invitee@khu.ac.kr", EmailType.PASSWORD_RESET, EmailType.PASSWORD_RESET.getSubject(),
                "SMTP 서버에 연결할 수 없어요", null);

        listener.onEmailLogEvent(event);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getEmailType()).isEqualTo(EmailType.PASSWORD_RESET);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(log.getErrorMessage()).isEqualTo("SMTP 서버에 연결할 수 없어요");
        assertThat(log.getMessageId()).isNull();
    }

    // 저장 자체가 실패해도(예: DB 커넥션 문제) 이 메서드가 예외를 밖으로 던지면 안 된다 — 왜인지는
    // EmailLogEventListener의 onEmailLogEvent() 주석 참고(@Async라 아무도 이 예외를 못 들음).
    @Test
    void onEmailLogEvent_RepositorySaveThrows_SwallowsExceptionInsteadOfPropagating() {
        doThrow(new RuntimeException("DB 커넥션이 죽었어요")).when(emailLogRepository).save(any());
        EmailLogEvent event = EmailLogEvent.success(
                "invitee@khu.ac.kr", EmailType.INVITE, EmailType.INVITE.getSubject(), null);

        assertThatCode(() -> listener.onEmailLogEvent(event)).doesNotThrowAnyException();
    }
}
