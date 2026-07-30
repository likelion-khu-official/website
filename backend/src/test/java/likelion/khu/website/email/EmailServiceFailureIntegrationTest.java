package likelion.khu.website.email;

import likelion.khu.website.email.exception.EmailSendException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SMTP 서버에 실제로 연결이 안 될 때 EmailService가 EmailSendException을 던지고
 * email_log에 FAILURE를 남기는지를 목이 아닌 진짜 연결 실패로 검증한다.
 * (EmailServiceTest#sendInviteEmail_MailServerRejects_... 의 통합 버전)
 */
@SpringBootTest
class EmailServiceFailureIntegrationTest extends MailpitContainerSupport {

    @DynamicPropertySource
    static void fastFailureTimeoutProperties(DynamicPropertyRegistry registry) {
        fastFailureTimeouts(registry);
    }

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Test
    void sendInviteEmail_SmtpServerUnreachable_ThrowsAndPersistsFailureInRealDb() {
        String to = "unreachable-target@khu.ac.kr";
        mailpit.stop();

        assertThatThrownBy(() -> emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=it-failure", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        List<EmailLog> logs = emailLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getRecipient()).isEqualTo(to);
        // status는 messageId와 무관한 별개 컬럼 — 실제 조회 시에도 FAILURE 여부는 이 값 하나로 바로 드러남
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(logs.get(0).getErrorMessage()).isNotBlank();
        // 연결 거부는 EmailService.classify()가 SMTP_CONNECTION_FAILED로 분류 — 목이 아니라 진짜
        // 연결 실패·진짜 SQLite CHECK 제약을 통과해 저장되는지까지 여기서 실증된다.
        assertThat(logs.get(0).getFailureCause()).isEqualTo(FailureCause.SMTP_CONNECTION_FAILED);
        // 연결 자체가 실패하는 경우 Spring이 Transport 연결을 saveChanges()보다 먼저 시도하다 터짐
        // → Message-ID가 아예 생성되지 않은 채로 실패가 확정됨 (실측 확인, 2026-07-07)
        assertThat(logs.get(0).getMessageId()).isNull();
    }
}
