package likelion.khu.website.email;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * #85 리뷰(신선우) + SQLite 커넥션 풀(=1) 실측 재현 — EmailService.send()를 실제 Spring
 * {@code @Transactional} 프록시 안에서 호출하면(TransactionalEmailInviter), 진짜로 즉시
 * IllegalStateException으로 실패하고 SMTP 시도도 email_log 기록도 전혀 안 남는지 검증한다.
 * (단위 버전은 EmailServiceTest#send_CalledWithActiveTransaction_...)
 *
 * Mailpit(Testcontainers)이 필요 없음 — 가드가 SMTP 시도 자체보다 먼저 막으므로, 컨테이너를
 * 안 띄우고 기본 test application.yml의 mail 설정(연결 안 되는 localhost:3025)만으로 충분하다.
 */
@SpringBootTest
class EmailServiceTransactionGuardIntegrationTest {

    @Autowired
    private TransactionalEmailInviter transactionalEmailInviter;

    @Autowired
    private EmailLogRepository emailLogRepository;

    @Test
    void sendInviteEmail_CalledInsideRealTransactionalProxy_FailsFastWithoutAttemptingSendOrLog() {
        String to = "guard-target@khu.ac.kr";

        assertThatThrownBy(() -> transactionalEmailInviter.inviteInsideTransaction(
                to, "https://admin.likelion-khu.com/invite?token=it-guard", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("트랜잭션");

        List<EmailLog> logs = emailLogRepository.findAll();
        assertThat(logs).isEmpty();
    }
}
