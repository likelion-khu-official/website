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
import org.testcontainers.utility.MountableFile;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * SMTP_AUTHENTICATION_FAILED — #113 후속. 여태 이 분류는 Mockito로 {@code MailAuthenticationException}을
 * 직접 만들어 던지는 방식으로만 검증했는데("실제 그 상황을 세팅하고 예외가 발생하는지 봐야 하는 거
 * 아니냐"는 지적, 2026-07-30), 그건 classify()의 타입 분기 로직만 검증할 뿐 "진짜 SMTP AUTH 거부에서
 * 이 예외가 실제로 나오는가"는 증명하지 못한다.
 *
 * 그래서 Mailpit을 {@code --smtp-auth-file}로 특정 자격증명만 허용하도록 띄우고, 앱은 일부러 틀린
 * 비밀번호로 접속해 진짜 SMTP {@code 535 Authentication credentials invalid} 응답을 받아낸다 —
 * 실제로 Python smtplib로 먼저 재현해 이 설정이 진짜 거부를 일으키는지 확인 후 옮긴 값이다
 * ({@code smtp-auth-test-user}/{@code correct-test-password}는 이 htpasswd 파일 검증 전용 값,
 * 실제 서비스와 무관).
 *
 * {@link MailpitContainerSupport}(다른 통합테스트 대다수가 공유하는 컨테이너)는
 * {@code --smtp-auth-accept-any}로 "아무 자격증명이나 받는다"가 핵심 전제라 이 테스트와 상충한다 —
 * 그래서 별도 컨테이너를 직접 띄운다.
 */
@Testcontainers
@SpringBootTest
class EmailServiceAuthenticationFailureIntegrationTest {

    private static final String VALID_USERNAME = "smtp-auth-test-user";

    @Container
    static final GenericContainer<?> mailpit =
            new GenericContainer<>(DockerImageName.parse("axllent/mailpit:v1.21"))
                    .withExposedPorts(1025, 8025)
                    .withCopyFileToContainer(MountableFile.forClasspathResource("mailpit-tls/cert.pem"), "/mailpit-tls/cert.pem")
                    .withCopyFileToContainer(MountableFile.forClasspathResource("mailpit-tls/key.pem"), "/mailpit-tls/key.pem")
                    .withCopyFileToContainer(
                            MountableFile.forClasspathResource("mailpit-tls/smtp-auth.htpasswd"), "/mailpit-tls/smtp-auth.htpasswd")
                    .withCommand(
                            "--smtp-tls-cert", "/mailpit-tls/cert.pem",
                            "--smtp-tls-key", "/mailpit-tls/key.pem",
                            "--smtp-require-starttls",
                            "--smtp-auth-file", "/mailpit-tls/smtp-auth.htpasswd"
                    );

    @DynamicPropertySource
    static void mailpitProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", mailpit::getHost);
        registry.add("spring.mail.port", () -> mailpit.getMappedPort(1025));
        registry.add("spring.mail.username", () -> VALID_USERNAME);
        // 일부러 틀린 비밀번호 — htpasswd가 요구하는 진짜 비밀번호("correct-test-password")와 다르게
        // 줘서 진짜 SMTP AUTH 거부를 유발한다.
        registry.add("spring.mail.password", () -> "wrong-password");
        registry.add("spring.mail.properties.mail.smtp.auth", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.ssl.trust", () -> "*");
        registry.add("spring.mail.properties.mail.smtp.connectiontimeout", () -> "3000");
        registry.add("spring.mail.properties.mail.smtp.timeout", () -> "3000");
        // 인증 실패는 재시도해도 매번 같은 결과 — 1회로 속도 확보(그래도 SMTP_AUTHENTICATION_FAILED
        // 자체는 재시도 대상으로 분류돼 있음, 실제 운영값은 기본 3회 — FailureCause 참고)
        registry.add("mail-sender.max-attempts", () -> "1");
        registry.add("mail-sender.retry-delay-ms", () -> "0");
    }

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Test
    void sendInviteEmail_WrongSmtpCredentials_ThrowsAndClassifiesAsAuthenticationFailed() {
        String to = "auth-failure-target@khu.ac.kr";

        assertThatThrownBy(() -> emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=it-auth-failure", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        List<EmailLog> logs = emailLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(logs.get(0).getFailureCause()).isEqualTo(FailureCause.SMTP_AUTHENTICATION_FAILED);
    }
}
