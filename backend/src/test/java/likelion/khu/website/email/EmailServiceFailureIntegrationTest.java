package likelion.khu.website.email;

import likelion.khu.website.email.exception.EmailSendException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SMTP 서버에 실제로 연결이 안 될 때 EmailService가 EmailSendException을 던지고
 * email_log에 FAILURE를 남기는지를 목이 아닌 진짜 연결 실패로 검증한다.
 * (EmailServiceTest#sendInviteEmail_MailServerRejects_... 의 통합 버전)
 */
// 테스트 2개가 인메모리 SQLite 컨텍스트를 공유해서 email_log가 누적되는 걸 막음
// (EmailServiceIntegrationTest와 동일 이유 — 그쪽 주석 참고).
@Testcontainers
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class EmailServiceFailureIntegrationTest {

    // AUTH+TLS 요구 여부는 이 테스트 결과엔 영향 없음(연결 자체가 안 되니 협상 전에 끊김) —
    // 그래도 실제 prod 설정과 다르게 두면 헷갈리니 다른 통합테스트들과 동일하게 맞춤
    @Container
    static final GenericContainer<?> mailpit =
            new GenericContainer<>(DockerImageName.parse("axllent/mailpit:v1.21"))
                    .withExposedPorts(1025, 8025)
                    .withCopyFileToContainer(MountableFile.forClasspathResource("mailpit-tls/cert.pem"), "/mailpit-tls/cert.pem")
                    .withCopyFileToContainer(MountableFile.forClasspathResource("mailpit-tls/key.pem"), "/mailpit-tls/key.pem")
                    .withCommand(
                            "--smtp-tls-cert", "/mailpit-tls/cert.pem",
                            "--smtp-tls-key", "/mailpit-tls/key.pem",
                            "--smtp-require-starttls",
                            "--smtp-auth-accept-any"
                    );

    @DynamicPropertySource
    static void mailProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", mailpit::getHost);
        registry.add("spring.mail.port", () -> mailpit.getMappedPort(1025));
        registry.add("spring.mail.username", () -> "mailpit-test-user");
        registry.add("spring.mail.password", () -> "mailpit-test-pass");
        registry.add("spring.mail.properties.mail.smtp.auth", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.ssl.trust", () -> "*");
        // 컨테이너를 끈 뒤 연결 실패를 빠르게 확인하기 위해 타임아웃을 짧게 둠.
        // 주의: 이 타임아웃은 이 테스트 클래스에만 적용됨 — main application.yml에서도 타임아웃(5초)을 두지만,
        // 여기선 실패 케이스를 빠르게 끝내기 위해 더 짧게(3초) 오버라이드한다.
        registry.add("spring.mail.properties.mail.smtp.connectiontimeout", () -> "3000");
        registry.add("spring.mail.properties.mail.smtp.timeout", () -> "3000");
    }

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Autowired
    private TransactionalEmailInviter transactionalEmailInviter;

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
        // 연결 자체가 실패하는 경우 Spring이 Transport 연결을 saveChanges()보다 먼저 시도하다 터짐
        // → Message-ID가 아예 생성되지 않은 채로 실패가 확정됨 (실측 확인, 2026-07-07)
        assertThat(logs.get(0).getMessageId()).isNull();
    }

    /**
     * #85 리뷰(신선우) 재현 — EmailService.send()는 자체 트랜잭션을 안 열어서, 호출자가
     * @Transactional 메서드 안에서 부르면 그 트랜잭션에 편입된다. 예전 구현(email_log를
     * emailLogRepository에 직접 save)이었다면 SMTP 실패로 던져진 EmailSendException이 바깥
     * 트랜잭션을 rollback-only로 마킹해 실패 로그까지 함께 사라졌을 것 — EmailLogRecorder의
     * REQUIRES_NEW 덕분에 바깥 트랜잭션이 롤백돼도 이 실패 기록은 살아남아야 한다.
     */
    @Test
    void sendInviteEmail_CalledInsideTransactionThatRollsBack_FailureLogSurvivesRollback() {
        String to = "rollback-failure-target@khu.ac.kr";
        mailpit.stop();

        assertThatThrownBy(() -> transactionalEmailInviter.inviteAndPropagateFailure(
                to, "https://admin.likelion-khu.com/invite?token=it-tx-rollback", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        List<EmailLog> logs = emailLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getRecipient()).isEqualTo(to);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.FAILURE);
    }
}
