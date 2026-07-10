package likelion.khu.website.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testcontainers로 실제 SMTP 서버(Mailpit)를 띄워 EmailService의 전체 경로
 * (Thymeleaf 렌더링 → JavaMailSender 실전송 → SMTP 프로토콜 → 수신함 도착)를 목 없이 검증한다.
 * OCI SMTP는 대상이 아님 — 우리 코드가 표준 SMTP 스펙대로 정확히 동작하는지가 검증 대상.
 * prod 프로파일을 명시해 "제목에 stage 접두어가 안 붙는다"도 실제 배포 조건 그대로 함께 검증한다.
 */
// @DirtiesContext 필수 — test application.yml이 인메모리 SQLite(jdbc:sqlite::memory:)라
// 컨텍스트를 재사용하면 커넥션도 재사용돼서, 이 클래스의 테스트 2개가 email_log를 공유해버림
// (두 번째 테스트 실행 시 첫 번째가 저장한 row가 남아있어 hasSize(1) 검증이 깨짐).
// 테스트마다 컨텍스트를 통째로 새로 띄워 매번 빈 DB로 시작하게 강제.
@Testcontainers
@SpringBootTest
@ActiveProfiles("prod")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class EmailServiceIntegrationTest {

    // 실제 OCI는 AUTH LOGIN + STARTTLS를 요구함(application.yml과 동일 조건) — Mailpit도 같은 협상을
    // 강제하도록 자체서명 인증서를 물려서, "이 프로토콜 경로가 실제로 동작하는지"까지 검증 대상에 포함시킨다.
    // (SPF/DKIM/DMARC나 OCI Approved Sender 같은 OCI 고유 정책은 이 컨테이너로도 검증 불가 — 별도 수동 확인 영역)
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

    // 컨테이너가 뜨는 host·port는 Docker가 실행 시점에 랜덤 배정 — test/resources/application.yml의
    // 고정값(localhost:3025)으론 못 맞추니, 컨텍스트가 뜨기 직전에 실제 값으로 덮어씀.
    @DynamicPropertySource
    static void mailProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", mailpit::getHost);
        registry.add("spring.mail.port", () -> mailpit.getMappedPort(1025));
        registry.add("spring.mail.username", () -> "mailpit-test-user");
        registry.add("spring.mail.password", () -> "mailpit-test-pass");
        // 실제 OCI 설정(application.yml)과 동일하게 AUTH+STARTTLS를 켠 채로 검증
        registry.add("spring.mail.properties.mail.smtp.auth", () -> "true");
        registry.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "true");
        // 자체서명 인증서라 기본 트러스트체인 검증은 통과 못 함 — 테스트 전용이라 신뢰 목록에 와일드카드로 등록
        registry.add("spring.mail.properties.mail.smtp.ssl.trust", () -> "*");
    }

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Test
    void sendInviteEmail_RealSmtpRoundTrip_ArrivesWithCorrectContentAndIsLogged() throws Exception {
        String to = "new-admin@khu.ac.kr";
        String inviteUrl = "https://admin.likelion-khu.com/invite?token=it-invite-abc123";
        LocalDateTime expiresAt = LocalDateTime.of(2026, Month.JULY, 10, 12, 0);

        emailService.sendInviteEmail(to, inviteUrl, expiresAt);

        JsonNode received = awaitMessageTo(to);
        assertThat(received.get("Subject").asText()).isEqualTo(EmailType.INVITE.getSubject());
        assertThat(received.get("From").get("Address").asText()).isEqualTo("noreply@likelion-khu.com");

        JsonNode detail = fetchMessageDetail(received.get("ID").asText());
        assertThat(detail.get("HTML").asText())
                .contains(inviteUrl)
                .contains("2026.07.10 12:00");

        List<EmailLog> logs = emailLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getRecipient()).isEqualTo(to);
        assertThat(logs.get(0).getEmailType()).isEqualTo(EmailType.INVITE);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.SUCCESS);
        assertThat(logs.get(0).getSubject()).isEqualTo(EmailType.INVITE.getSubject());
        assertThat(logs.get(0).getSentAt()).isNotNull();
        // status는 messageId와 무관하게 EmailLog.failure()/success()에서 직접 세팅되는 별개 컬럼 —
        // 여기 SUCCESS 케이스는 messageId도 채워지는지까지 같이 보는 것뿐, 실패 여부 판단에 messageId가 필요한 건 아님.
        // 실제 JavaMailSender가 SMTP 전송 직전 saveChanges()로 생성한 진짜 Message-ID.
        // 우리 쪽 저장값은 RFC 5322 형식 그대로(<...> 포함), Mailpit API는 꺾쇠를 벗겨서 돌려줌 — 같은 값인지 벗겨서 비교.
        assertThat(logs.get(0).getMessageId()).isNotBlank().startsWith("<").endsWith(">");
        String strippedMessageId = logs.get(0).getMessageId().replaceAll("[<>]", "");
        assertThat(detail.get("MessageID").asText()).isEqualTo(strippedMessageId);
    }

    @Test
    void sendPasswordResetEmail_RealSmtpRoundTrip_ArrivesWithCorrectContentAndIsLogged() throws Exception {
        String to = "existing-admin@khu.ac.kr";
        String resetUrl = "https://admin.likelion-khu.com/reset-password?token=it-reset-xyz789";
        LocalDateTime expiresAt = LocalDateTime.of(2026, Month.JULY, 11, 9, 30);

        emailService.sendPasswordResetEmail(to, resetUrl, expiresAt);

        JsonNode received = awaitMessageTo(to);
        assertThat(received.get("Subject").asText()).isEqualTo(EmailType.PASSWORD_RESET.getSubject());

        JsonNode detail = fetchMessageDetail(received.get("ID").asText());
        assertThat(detail.get("HTML").asText())
                .contains(resetUrl)
                .contains("2026.07.11 09:30");

        List<EmailLog> logs = emailLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getEmailType()).isEqualTo(EmailType.PASSWORD_RESET);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.SUCCESS);
        assertThat(logs.get(0).getMessageId()).isNotBlank();
        assertThat(detail.get("MessageID").asText())
                .isEqualTo(logs.get(0).getMessageId().replaceAll("[<>]", ""));
    }

    /** Mailpit이 SMTP로 받은 메일을 API에 반영하기까지의 짧은 지연을 흡수하기 위한 폴링. */
    private JsonNode awaitMessageTo(String to) throws Exception {
        for (int attempt = 0; attempt < 20; attempt++) {
            JsonNode messages = fetchMessages();
            for (JsonNode message : messages.get("messages")) {
                if (message.get("To").get(0).get("Address").asText().equals(to)) {
                    return message;
                }
            }
            Thread.sleep(150);
        }
        throw new AssertionError("Mailpit에서 " + to + " 수신 메일을 찾지 못했어요 (타임아웃)");
    }

    private JsonNode fetchMessages() throws Exception {
        return getJson("/api/v1/messages");
    }

    private JsonNode fetchMessageDetail(String id) throws Exception {
        return getJson("/api/v1/message/" + id);
    }

    private JsonNode getJson(String path) throws Exception {
        String baseUrl = "http://" + mailpit.getHost() + ":" + mailpit.getMappedPort(8025);
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path)).GET().build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return OBJECT_MAPPER.readTree(response.body());
    }
}
