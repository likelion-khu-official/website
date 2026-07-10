package likelion.khu.website.email;

import jakarta.mail.Message;
import jakarta.mail.internet.MimeMessage;
import likelion.khu.website.email.exception.EmailSendException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.IContext;
import org.thymeleaf.exceptions.TemplateProcessingException;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.time.LocalDateTime;
import java.time.Month;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// mailSender·emailLogRepository만 목(mock) 처리하고 templateEngine은 진짜 SpringTemplateEngine을 씀
// — 렌더링된 본문에 실제 값이 들어갔는지까지 검증하려면 템플릿 엔진이 진짜여야 함(목이면 process()가 빈 값 반환).
class EmailServiceTest {

    private static final String FROM = "noreply@likelion-khu.com";

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private SpringTemplateEngine templateEngine;
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        // @ExtendWith(MockitoExtension.class) 대신 수동으로 @Mock 필드를 초기화하는 방식(효과는 동일).
        MockitoAnnotations.openMocks(this);

        // 스프링 컨테이너를 안 띄우는 단위 테스트라 Thymeleaf 자동설정이 없음 — application.yml에
        // 커스텀 thymeleaf 설정이 없어 Spring Boot 기본값(classpath:/templates/, .html)을 손으로 재현.
        // (나중에 application.yml에 thymeleaf 설정이 추가되면 여기도 같이 맞춰야 함 — 자동 동기화 안 됨)
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);

        emailService = createService("prod");

        // createMimeMessage()가 Mockito 목이 아니라 진짜 MimeMessage를 반환하게 함 — 목이면 helper.setSubject() 등이
        // 아무 상태도 안 바꾸는 빈 껍데기라, 나중에 sent.getSubject()로 값을 다시 꺼내는 검증이 불가능해짐.
        // Session은 null이어도 무방 — mailSender.send() 자체가 목이라 실제 세션 연결이 일어나지 않음.
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage((jakarta.mail.Session) null));
    }

    // final 필드(mailSender 등) 5개는 생성자로 바로 주입 가능하지만, from은 @Value 필드 주입이라
    // 생성자 파라미터가 아님 — 리플렉션(ReflectionTestUtils)으로 private 필드에 강제로 값을 넣어야 함.
    private EmailService createService(String... activeProfiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(activeProfiles);
        EmailService service = new EmailService(mailSender, templateEngine, emailLogRepository, eventPublisher, environment);
        ReflectionTestUtils.setField(service, "from", FROM);
        return service;
    }

    @Test
    void sendInviteEmail_Success_SendsMailWithInviteValuesAndLogsSuccess() throws Exception {
        String to = "invitee@khu.ac.kr";
        String inviteUrl = "https://admin.likelion-khu.com/invite?token=abc123";
        LocalDateTime expiresAt = LocalDateTime.of(2026, Month.JULY, 8, 15, 30);

        emailService.sendInviteEmail(to, inviteUrl, expiresAt);

        // sent: mailSender.send(...)에 실제 인자로 넘어갔던(=전송 시도된) MimeMessage를 캡처해온 것.
        // send()는 EmailService/JavaMailSender의 "보내라" 동작(메서드)이고, sent는 그 결과물(변수 이름)일 뿐 — 서로 무관.
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
        assertThat(log.getEmailType()).isEqualTo(EmailType.INVITE);
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
        assertThat(log.getEmailType()).isEqualTo(EmailType.PASSWORD_RESET);
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
        assertThat(log.getEmailType()).isEqualTo(EmailType.INVITE);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(log.getErrorMessage()).contains("SMTP 서버에 연결할 수 없어요");
        assertThat(log.getMessageId()).isNull();
    }

    // 서로 다른 두 형식 오류(@ 없음 / 꺾쇠 안 닫힘)를 각각 테스트로 남긴 이유는 email-module.md 39번 줄 참고 —
    // InternetAddress.validate()가 실제로 걸러주는지 확인하다 발견된 실제 버그(검증 누락)를 고친 지점.
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

    // setUp()의 기본 emailService(prod)와 별개로 stage용 인스턴스를 하나 더 만듦 — createService가
    // 매번 새 EmailService를 반환하지만 mailSender/emailLogRepository 목은 그대로 재사용(필드 공유).
    @Test
    void sendInviteEmail_StageProfile_PrefixesSubjectAndLogsPrefixedSubject() throws Exception {
        EmailService stageEmailService = createService("stage");
        String to = "invitee@khu.ac.kr";

        stageEmailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1));

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getSubject())
                .isEqualTo("[stage] " + EmailType.INVITE.getSubject());

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getSubject())
                .isEqualTo("[stage] " + EmailType.INVITE.getSubject());
    }

    @Test
    void sendInviteEmail_ProdProfile_DoesNotPrefixSubject() throws Exception {
        emailService.sendInviteEmail(
                "invitee@khu.ac.kr", "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1));

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getSubject()).isEqualTo(EmailType.INVITE.getSubject());
    }

    // send()의 catch를 (MessagingException | MailException)에서 Exception으로 넓히기 전엔, InternetAddress가
    // to=null에서 MessagingException이 아닌 예외(NPE 등)를 던지면 이 catch를 통과해 로그도 안 남고
    // EmailSendException도 아닌 원본 예외가 그대로 새어나갔다 — 그 회귀를 막기 위한 테스트.
    @Test
    void sendInviteEmail_NullRecipient_LogsFailureAndThrowsEmailSendException() {
        assertThatThrownBy(() -> emailService.sendInviteEmail(
                null, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        verify(mailSender, never()).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(log.getMessageId()).isNull();
    }

    // send()가 템플릿 렌더링(try 밖에 있던 시절)에서 던져지는 예외까지 email_log에 반드시 남기고
    // EmailSendException으로 통일해 던지는지 확인 — templateEngine만 이 테스트 한정으로 별도 목으로 교체.
    @Test
    void sendInviteEmail_TemplateRenderingFails_LogsFailureAndThrowsEmailSendException() {
        TemplateEngine brokenTemplateEngine = mock(TemplateEngine.class);
        when(brokenTemplateEngine.process(anyString(), any(IContext.class)))
                .thenThrow(new TemplateProcessingException("템플릿이 깨졌어요"));

        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        EmailService serviceWithBrokenTemplate =
                new EmailService(mailSender, brokenTemplateEngine, emailLogRepository, eventPublisher, environment);
        ReflectionTestUtils.setField(serviceWithBrokenTemplate, "from", FROM);

        assertThatThrownBy(() -> serviceWithBrokenTemplate.sendInviteEmail(
                "invitee@khu.ac.kr", "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        // 템플릿 렌더링 단계에서 이미 터져서 실제 send() 시도까지 가지도 않음
        verify(mailSender, never()).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(log.getErrorMessage()).contains("템플릿이 깨졌어요");
        assertThat(log.getMessageId()).isNull();
    }

    // #85 리뷰(신선우) + SQLite 커넥션 풀 실측 재현 — 활성 트랜잭션 안에서 부르면 email_log를 직접
    // save()하지 않고 EmailLogEvent를 발행해야 한다(왜 그런지는 EmailService.recordSuccess() 주석 참고).
    // TransactionSynchronizationManager를 직접 조작해서 실제 DB·Spring 컨텍스트 없이도 "트랜잭션이
    // 활성 상태"라는 조건만 순수 단위테스트로 재현한다 — 통합 버전은 EmailServiceTransactionBoundaryIntegrationTest.
    @Test
    void send_CalledWithActiveTransaction_PublishesEventInsteadOfSavingDirectly() {
        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            String to = "invitee@khu.ac.kr";
            emailService.sendInviteEmail(
                    to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1));

            verify(mailSender).send(any(MimeMessage.class));
            verify(emailLogRepository, never()).save(any());

            ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            assertThat(eventCaptor.getValue()).isInstanceOf(EmailLogEvent.class);
            EmailLogEvent event = (EmailLogEvent) eventCaptor.getValue();
            assertThat(event.recipient()).isEqualTo(to);
            assertThat(event.emailType()).isEqualTo(EmailType.INVITE);
            assertThat(event.status()).isEqualTo(EmailStatus.SUCCESS);
        } finally {
            // 이 테스트 이후에도 ThreadLocal이 true로 남아 다른 테스트를 오염시키면 안 됨
            TransactionSynchronizationManager.setActualTransactionActive(false);
        }
    }
}
