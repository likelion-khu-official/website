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
 * 여기서 다루는 "실패"는 딱 하나 — SMTP 서버 자체에 연결이 안 되는 경우(mailpit.stop()으로
 * 재현, 운영 환경 기준으론 OCI Email Delivery 장애에 해당). 이메일 주소 형식 오류처럼 발송
 * *이전* 단계에서 걸러지는 클라이언트 쪽 실패는 별개 대상이라 EmailServiceTest에서 이미 다룬다.
 *
 * EmailServiceFailureIntegrationTest와 같은 이유로 별도 클래스로 분리(컨테이너를 실제로
 * 내려야 해서 같은 클래스의 다른(성공) 테스트와 컨테이너 상태를 공유하면 안 됨).
 *
 * AuthEmailHttpEndToEndIntegrationTest와 달리 @ActiveProfiles("prod")·@DirtiesContext는
 * 의도적으로 뺐다 — 여기선 메일 제목(prod와 stage 접두어 차이)을 검증하지 않고, email_log
 * 조회도 매 테스트가 자기만의 수신자 주소로 필터링해서 봐서(awaitEmailLogFor) 같은 컨텍스트를
 * 재사용해도 두 테스트의 결과가 섞이지 않는다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthEmailHttpFailureIntegrationTest extends MailpitContainerSupport {

    @DynamicPropertySource
    static void fastFailureTimeoutProperties(DynamicPropertyRegistry registry) {
        fastFailureTimeouts(registry);
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

    // forgot은 초대와 달리 502로 새지 않는다 — #90 스펙(계정 열거 방지)이 상태 코드 레벨에서도
    // 지켜져야 해서(#123 리뷰, ParkIlha), SMTP 장애 중에도 존재하는 이메일이 (없는 이메일과 다르게)
    // 502를 받으면 그 자체가 "이 이메일 등록돼 있음"을 흘리는 사이드채널이 된다. 그래서 forgot은
    // AdminPasswordResetService에서 EmailSendException을 삼키고 항상 200 + 동일 메시지로 응답하되,
    // email_log FAILURE 기록·토큰 롤백은 그대로 유지되는지 확인한다.
    @Test
    void forgot_SmtpServerUnreachable_ViaRealHttp_Returns200ButStillLogsFailureAndRollsBackToken() throws Exception {
        String to = "http-failure-reset@khu.ac.kr";
        Admin admin = adminRepository.save(
                Admin.register(to, "이름", passwordEncoder.encode("password1"), AdminRole.ADMIN));
        mailpit.stop();

        mockMvc.perform(post("/api/admin/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + to + "\"}"))
                .andExpect(status().isOk());

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
