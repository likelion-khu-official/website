package likelion.khu.website.email;

import jakarta.mail.Message;
import jakarta.mail.internet.MimeMessage;
import likelion.khu.website.email.exception.EmailSendException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.time.LocalDateTime;
import java.time.Month;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailServiceTest {

    private static final String FROM = "noreply@likelion-khu.com";

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailLogRepository emailLogRepository;

    private SpringTemplateEngine templateEngine;
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);

        emailService = createService("prod");

        when(mailSender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage((jakarta.mail.Session) null));
    }

    private EmailService createService(String... activeProfiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(activeProfiles);
        EmailService service = new EmailService(mailSender, templateEngine, emailLogRepository, environment);
        ReflectionTestUtils.setField(service, "from", FROM);
        return service;
    }

    @Test
    void sendInviteEmail_Success_SendsMailWithInviteValuesAndLogsSuccess() throws Exception {
        String to = "invitee@khu.ac.kr";
        String inviteUrl = "https://admin.likelion-khu.com/invite?token=abc123";
        LocalDateTime expiresAt = LocalDateTime.of(2026, Month.JULY, 8, 15, 30);

        emailService.sendInviteEmail(to, inviteUrl, expiresAt);

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        MimeMessage sent = messageCaptor.getValue();

        assertThat(sent.getSubject()).isEqualTo(EmailType.INVITE.getSubject());
        assertThat(sent.getFrom()[0].toString()).contains(FROM);
        assertThat(sent.getRecipients(Message.RecipientType.TO)[0].toString()).contains(to);
        assertThat(sent.getContent().toString())
                .contains(inviteUrl)
                .contains("2026.07.08 15:30");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getRecipient()).isEqualTo(to);
        assertThat(log.getType()).isEqualTo(EmailType.INVITE);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.SUCCESS);
        assertThat(log.getSubject()).isEqualTo(EmailType.INVITE.getSubject());
        assertThat(log.getErrorMessage()).isNull();
        // 목 JavaMailSender는 saveChanges()를 실행하지 않아 Message-ID가 안 생김 — 실경로 검증은 통합테스트가 담당
        assertThat(log.getMessageId()).isNull();
    }

    @Test
    void sendPasswordResetEmail_Success_SendsMailWithResetValuesAndLogsSuccess() throws Exception {
        String to = "admin@khu.ac.kr";
        String resetUrl = "https://admin.likelion-khu.com/reset-password?token=xyz789";
        LocalDateTime expiresAt = LocalDateTime.of(2026, Month.JULY, 9, 9, 0);

        emailService.sendPasswordResetEmail(to, resetUrl, expiresAt);

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        MimeMessage sent = messageCaptor.getValue();

        assertThat(sent.getSubject()).isEqualTo(EmailType.PASSWORD_RESET.getSubject());
        assertThat(sent.getRecipients(Message.RecipientType.TO)[0].toString()).contains(to);
        assertThat(sent.getContent().toString())
                .contains(resetUrl)
                .contains("2026.07.09 09:00");

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getType()).isEqualTo(EmailType.PASSWORD_RESET);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.SUCCESS);
    }

    @Test
    void sendInviteEmail_MailServerRejects_LogsFailureAndThrowsEmailSendException() {
        String to = "invitee@khu.ac.kr";
        doThrow(new MailSendException("SMTP 서버에 연결할 수 없어요"))
                .when(mailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getRecipient()).isEqualTo(to);
        assertThat(log.getType()).isEqualTo(EmailType.INVITE);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(log.getErrorMessage()).contains("SMTP 서버에 연결할 수 없어요");
        assertThat(log.getMessageId()).isNull();
    }

    @Test
    void sendInviteEmail_AddressWithNoAtSign_FailsBeforeSendAttemptAndLogsFailureWithoutMessageId() {
        assertMalformedAddressRejected("not-an-email-address");
    }

    @Test
    void sendInviteEmail_AddressWithUnbalancedAngleBracket_FailsBeforeSendAttemptAndLogsFailureWithoutMessageId() {
        assertMalformedAddressRejected("broken<address@@khu.ac.kr");
    }

    private void assertMalformedAddressRejected(String malformedTo) {
        assertThatThrownBy(() -> emailService.sendInviteEmail(
                malformedTo, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        // 주소 검증 단계에서 이미 터져서 실제 send() 시도까지 가지도 않음
        verify(mailSender, never()).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getRecipient()).isEqualTo(malformedTo);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(log.getErrorMessage()).isNotBlank();
        // saveChanges()가 실행된 적 없어 Message-ID 자체가 안 생김 — SMTP 서버 거부(다른 테스트)와 다른 실패 지점
        assertThat(log.getMessageId()).isNull();
    }

    @Test
    void sendInviteEmail_StageProfile_PrefixesSubjectAndLogsPrefixedSubject() throws Exception {
        EmailService stageEmailService = createService("stage");
        String to = "invitee@khu.ac.kr";

        stageEmailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1));

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getSubject())
                .isEqualTo("[STAGE 테스트] " + EmailType.INVITE.getSubject());

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getSubject())
                .isEqualTo("[STAGE 테스트] " + EmailType.INVITE.getSubject());
    }

    @Test
    void sendInviteEmail_ProdProfile_DoesNotPrefixSubject() throws Exception {
        emailService.sendInviteEmail(
                "invitee@khu.ac.kr", "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1));

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getSubject()).isEqualTo(EmailType.INVITE.getSubject());
    }
}
