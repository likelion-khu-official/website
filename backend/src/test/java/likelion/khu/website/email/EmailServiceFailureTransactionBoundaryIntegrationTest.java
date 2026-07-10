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
 * #85 리뷰(신선우) + SQLite 커넥션 풀(=1) 실측 재현 — EmailService.send()를 실제 Spring
 * {@code @Transactional} 프록시 안에서 호출했을 때(TransactionalEmailInviter), SMTP 실패로
 * 바깥 트랜잭션이 롤백돼도 실패 로그가 email_log에 실제로 남는지 검증한다(EmailLogEventListener의
 * 비동기 AFTER_COMPLETION 경로를 거치므로, 별도 스레드가 저장을 마칠 때까지 폴링해서 확인한다).
 *
 * 별도 클래스로 분리한 이유: mailpit을 이 테스트에서 꺼야 하는데, 같은 클래스에 살아있는 mailpit이
 * 필요한 다른 테스트를 같이 두면 컨테이너 상태 공유 문제가 생긴다(먼저 실행된 테스트가 꺼버리면
 * @DirtiesContext로 컨텍스트가 재생성될 때 @DynamicPropertySource가 이미 죽은 컨테이너의 포트를
 * 물어보다 실패 — 1차 시도 때 CI에서 실제로 겪음). 그래서 이 클래스는 "mailpit을 꺼야 하는"
 * 테스트끼리만 모아둔다 — @DirtiesContext를 안 쓰므로(컨텍스트를 재생성 안 함) 두 테스트가
 * 컨테이너 하나를 공유해도 안전하다(두 번째 mailpit.stop() 호출은 이미 꺼진 컨테이너에 대한
 * 멱등 호출일 뿐).
 */
@Testcontainers
@SpringBootTest
class EmailServiceFailureTransactionBoundaryIntegrationTest {

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
        registry.add("spring.mail.properties.mail.smtp.connectiontimeout", () -> "3000");
        registry.add("spring.mail.properties.mail.smtp.timeout", () -> "3000");
    }

    @Autowired
    private TransactionalEmailInviter transactionalEmailInviter;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Test
    void sendInviteEmail_CalledInsideTransactionThatRollsBack_FailureLogEventuallySurvivesRollback() throws Exception {
        String to = "rollback-failure-target@khu.ac.kr";
        mailpit.stop();

        assertThatThrownBy(() -> transactionalEmailInviter.inviteAndPropagateFailure(
                to, "https://admin.likelion-khu.com/invite?token=it-tx-rollback", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        List<EmailLog> logs = awaitEmailLogFor(to);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.FAILURE);
    }

    /**
     * 위 테스트와 다른 조합 — 발송은 실패했지만 호출자가 예외를 삼켜서 트랜잭션이 롤백 없이
     * "정상 커밋"되는 경우. EmailService 입장에선 실패 시점에 이미 이벤트를 발행해뒀으므로
     * (recordFailureSafely), 그 트랜잭션이 이후에 커밋되든 롤백되든(AFTER_COMPLETION이라 둘 다
     * 잡힘) 결과는 같아야 한다 — 그걸 실제로 커밋되는 경로로 확인한다.
     */
    @Test
    void sendInviteEmail_FailsButCallerSwallowsExceptionAndCommitsNormally_FailureLogEventuallyPersists()
            throws Exception {
        String to = "swallowed-failure-target@khu.ac.kr";
        mailpit.stop();

        transactionalEmailInviter.inviteAndSwallowFailure(
                to, "https://admin.likelion-khu.com/invite?token=it-tx-swallow", LocalDateTime.now().plusDays(1));

        List<EmailLog> logs = awaitEmailLogFor(to);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.FAILURE);
    }

    /** EmailLogEventListener가 별도 스레드(@Async)에서 저장을 마칠 때까지 짧게 폴링. */
    private List<EmailLog> awaitEmailLogFor(String to) throws InterruptedException {
        for (int attempt = 0; attempt < 40; attempt++) {
            List<EmailLog> logs = emailLogRepository.findAll().stream()
                    .filter(log -> log.getRecipient().equals(to))
                    .toList();
            if (!logs.isEmpty()) {
                return logs;
            }
            Thread.sleep(50);
        }
        throw new AssertionError(to + " 앞으로 온 email_log 기록을 찾지 못했어요 (타임아웃)");
    }
}
