package likelion.khu.website.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * stage 프로파일에서 실제로 나가는 메일 제목에 [STAGE 테스트] 접두어가 붙는지,
 * email_log에도 접두어 포함 제목이 남는지를 실제 SMTP+DB로 검증한다.
 * (EmailServiceTest#sendInviteEmail_StageProfile_... 의 통합 버전 — 목이 아닌 실경로)
 */
@Testcontainers
@SpringBootTest
@ActiveProfiles("stage")
class EmailServiceStageProfileIntegrationTest {

    // 실제 OCI는 AUTH LOGIN + STARTTLS를 요구함 — 같은 협상을 강제하도록 자체서명 인증서를 물림
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
    }

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Test
    void sendInviteEmail_StageProfileRealSmtp_SubjectHasPrefixInInboxAndLog() throws Exception {
        String to = "stage-admin@khu.ac.kr";

        emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=it-stage-invite", LocalDateTime.now().plusDays(1));

        JsonNode received = awaitMessageTo(to);
        assertThat(received.get("Subject").asText())
                .isEqualTo("[STAGE 테스트] " + EmailType.INVITE.getSubject());

        List<EmailLog> logs = emailLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getSubject())
                .isEqualTo("[STAGE 테스트] " + EmailType.INVITE.getSubject());
        assertThat(logs.get(0).getMessageId()).isNotBlank();
    }

    private JsonNode awaitMessageTo(String to) throws Exception {
        for (int attempt = 0; attempt < 20; attempt++) {
            JsonNode messages = getJson("/api/v1/messages");
            for (JsonNode message : messages.get("messages")) {
                if (message.get("To").get(0).get("Address").asText().equals(to)) {
                    return message;
                }
            }
            Thread.sleep(150);
        }
        throw new AssertionError("Mailpit에서 " + to + " 수신 메일을 찾지 못했어요 (타임아웃)");
    }

    private JsonNode getJson(String path) throws Exception {
        String baseUrl = "http://" + mailpit.getHost() + ":" + mailpit.getMappedPort(8025);
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path)).GET().build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return OBJECT_MAPPER.readTree(response.body());
    }
}
