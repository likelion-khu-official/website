package likelion.khu.website.email;

import likelion.khu.website.email.exception.EmailSendException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SMTP 서버에 실제로 연결이 안 될 때 EmailService가 EmailSendException을 던지고
 * email_log에 FAILURE를 남기는지를 목이 아닌 진짜 연결 실패로 검증한다.
 * (EmailServiceTest#sendInviteEmail_MailServerRejects_... 의 통합 버전)
 */
@Testcontainers
@SpringBootTest
class EmailServiceFailureIntegrationTest {

    @Container
    static final GenericContainer<?> mailpit =
            new GenericContainer<>(DockerImageName.parse("axllent/mailpit:v1.21"))
                    .withExposedPorts(1025, 8025);

    @DynamicPropertySource
    static void mailProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", mailpit::getHost);
        registry.add("spring.mail.port", () -> mailpit.getMappedPort(1025));
        registry.add("spring.mail.username", () -> "");
        registry.add("spring.mail.password", () -> "");
        registry.add("spring.mail.properties.mail.smtp.auth", () -> "false");
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "false");
        // 컨테이너를 끈 뒤 연결 실패를 빠르게 확인하기 위해 타임아웃을 짧게 둠
        registry.add("spring.mail.properties.mail.smtp.connectiontimeout", () -> "3000");
        registry.add("spring.mail.properties.mail.smtp.timeout", () -> "3000");
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
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(logs.get(0).getErrorMessage()).isNotBlank();
        // 연결 자체가 실패하는 경우 Spring이 Transport 연결을 saveChanges()보다 먼저 시도하다 터짐
        // → Message-ID가 아예 생성되지 않은 채로 실패가 확정됨 (실측 확인, 2026-07-07)
        assertThat(logs.get(0).getMessageId()).isNull();
    }
}
