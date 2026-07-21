package likelion.khu.website.email;

import likelion.khu.website.admin.Admin;
import likelion.khu.website.admin.AdminRepository;
import likelion.khu.website.admin.AdminRole;
import likelion.khu.website.admin.WithMockAdminUser;
import likelion.khu.website.admin.invitation.AdminInvitationRepository;
import likelion.khu.website.admin.invitation.InvitationStatus;
import likelion.khu.website.admin.password.PasswordResetTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * #113 QA — 앞서 만든 AuthEmailHttpEndToEndIntegrationTest가 "성공 경로"만 실제 HTTP로
 * 검증했다는 지적(초대·비번재설정 이메일 발송이 실패하는 경우는 안 봤음)을 메운다.
 * #113의 실제 목적(email_log 실패 임계치 알림)은 "발송이 실패해도 email_log에 FAILURE가
 * 안정적으로 남는가"에 의존하므로, 성공 경로보다 오히려 이 실패 경로가 더 핵심적이다.
 *
 * EmailServiceFailureIntegrationTest와 같은 이유로 별도 클래스로 분리(컨테이너를 실제로
 * 내려야 해서 같은 클래스의 다른(성공) 테스트와 컨테이너 상태를 공유하면 안 됨).
 *
 * AuthEmailHttpEndToEndIntegrationTest와 달리 @ActiveProfiles("prod")·@DirtiesContext는
 * 의도적으로 뺐다 — 여기선 메일 제목(prod와 stage 접두어 차이)을 검증하지 않고, email_log
 * 조회도 매 테스트가 자기만의 수신자 주소로 필터링해서 봐서(awaitEmailLogFor) 같은 컨텍스트를
 * 재사용해도 두 테스트의 결과가 섞이지 않는다.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class AuthEmailHttpFailureIntegrationTest {

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
        // 컨테이너를 내린 뒤 연결 실패를 빠르게 확인 — EmailServiceFailureIntegrationTest와 동일 값.
        registry.add("spring.mail.properties.mail.smtp.connectiontimeout", () -> "3000");
        registry.add("spring.mail.properties.mail.smtp.timeout", () -> "3000");
    }

    @Autowired MockMvc mockMvc;
    @Autowired AdminRepository adminRepository;
    @Autowired AdminInvitationRepository invitationRepository;
    @Autowired PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired EmailLogRepository emailLogRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @Test
    @WithMockAdminUser(email = "super@khu.ac.kr", role = "SUPER_ADMIN")
    void invite_SmtpServerUnreachable_ViaRealHttp_Returns502AndStillLogsFailure() throws Exception {
        String to = "http-failure-invite@khu.ac.kr";
        mailpit.stop();

        mockMvc.perform(post("/api/admin/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + to + "\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("EMAIL_SEND_FAILED"));

        List<EmailLog> logs = awaitEmailLogFor(to);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.FAILURE);

        // 초대 저장 → 메일 발송이 같은 @Transactional 안이라, 발송 실패 시 초대 레코드도 롤백된다
        // (email_log FAILURE만 비동기로 살아남음) — 500 대신 502를 받은 클라이언트가 재시도하면
        // 멱등하게 새 초대가 발급되는 게 맞는지 확인.
        assertThat(invitationRepository.findByEmailAndStatus(to, InvitationStatus.PENDING)).isEmpty();
    }

    @Test
    void forgot_SmtpServerUnreachable_ViaRealHttp_Returns502AndStillLogsFailure() throws Exception {
        String to = "http-failure-reset@khu.ac.kr";
        Admin admin = adminRepository.save(
                Admin.register(to, "이름", passwordEncoder.encode("password1"), AdminRole.ADMIN));
        mailpit.stop();

        mockMvc.perform(post("/api/admin/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + to + "\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("EMAIL_SEND_FAILED"));

        List<EmailLog> logs = awaitEmailLogFor(to);
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getStatus()).isEqualTo(EmailStatus.FAILURE);

        assertThat(passwordResetTokenRepository.findAll().stream()
                .anyMatch(t -> t.getAdminId().equals(admin.getId())))
                .isFalse();
    }

    private List<EmailLog> awaitEmailLogFor(String to) throws InterruptedException {
        for (int attempt = 0; attempt < 60; attempt++) {
            List<EmailLog> logs = emailLogRepository.findAll().stream()
                    .filter(log -> log.getRecipient().equals(to))
                    .toList();
            if (!logs.isEmpty()) {
                return logs;
            }
            Thread.sleep(100);
        }
        throw new AssertionError(to + " 앞으로 온 email_log 기록을 찾지 못했어요 (타임아웃)");
    }
}
