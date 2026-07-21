package likelion.khu.website.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.admin.WithMockAdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * #113 (모집 이메일 사전 시나리오 테스트) — item 3 "기존 매직링크(feed) 흐름 기준 자동화 E2E"의
 * email_log 확인 요구를 admin 초대·비번재설정(현재 존재하는 실제 발송 흐름)에 적용한다.
 *
 * 기존 AdminInvitationControllerTest·AdminPasswordControllerTest는 EmailService를
 * @MockitoBean으로 대체해서 "이메일을 보내려고 시도했는가"만 검증하고, EmailServiceIntegrationTest는
 * EmailService를 직접 호출해서 "발송·기록 로직 자체"만 검증한다 — 실제 HTTP 엔드포인트 호출이
 * EmailService 목 없이 email_log까지 실제로 남기는 전체 경로는 어느 쪽도 검증한 적이 없었다
 * (backend/docs/email-module.md "아직 못 메꾼 빈틈" 표에도 있던 갭).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("prod")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AuthEmailHttpEndToEndIntegrationTest extends MailpitContainerSupport {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Autowired MockMvc mockMvc;
    @Autowired AdminRepository adminRepository;
    @Autowired EmailLogRepository emailLogRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @Test
    @WithMockAdminUser(email = "super@khu.ac.kr", role = "SUPER_ADMIN")
    void invite_RealHttpCall_CreatesEmailLogRowAndActuallyDeliversMail() throws Exception {
        String to = "http-e2e-invite@khu.ac.kr";

        mockMvc.perform(post("/api/admin/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + to + "\"}"))
                .andExpect(status().isCreated());

        awaitMessageTo(to);

        List<EmailLog> logs = awaitEmailLogFor(to);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getEmailType()).isEqualTo(EmailType.INVITE);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.SUCCESS);
    }

    @Test
    void forgot_RealHttpCall_CreatesEmailLogRowAndActuallyDeliversMail() throws Exception {
        String to = "http-e2e-reset@khu.ac.kr";
        adminRepository.save(Admin.register(to, "이름", passwordEncoder.encode("password1"), AdminRole.ADMIN));

        mockMvc.perform(post("/api/admin/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + to + "\"}"))
                .andExpect(status().isOk());

        awaitMessageTo(to);

        List<EmailLog> logs = awaitEmailLogFor(to);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getEmailType()).isEqualTo(EmailType.PASSWORD_RESET);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.SUCCESS);
    }

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
