package likelion.khu.website.email;

import jakarta.mail.Message;
import jakarta.mail.SendFailedException;
import jakarta.mail.internet.MimeMessage;
import likelion.khu.website.email.exception.EmailSendException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.thymeleaf.TemplateEngine;
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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// mailSender·emailLogRepository만 목(mock) 처리하고 templateEngine은 진짜 SpringTemplateEngine을 씀
// — 렌더링된 본문에 실제 값이 들어갔는지까지 검증하려면 템플릿 엔진이 진짜여야 함(목이면 process()가 빈 값 반환).
class EmailServiceTest {

    private static final String FROM = "noreply@likelion-khu.com";
    private static final int MAX_ATTEMPTS = 3;

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
        // @Value 필드는 스프링 컨텍스트 없이 만든 인스턴스엔 채워지지 않아(기본값 0) 명시적으로 세팅
        // 안 하면 재시도 루프가 한 번도 안 돎 — retryDelayMs는 0으로 둬서 재시도 테스트도 즉시 끝나게 함.
        ReflectionTestUtils.setField(service, "maxAttempts", MAX_ATTEMPTS);
        ReflectionTestUtils.setField(service, "retryDelayMs", 0L);
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
    void sendRecruitmentOpenEmail_LinksToCanonicalApplicationForm() throws Exception {
        String to = "subscriber@example.com";

        emailService.sendRecruitmentOpenEmail(to, "https://likelion-khu.com");

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        String html = messageCaptor.getValue().getContent().toString();

        assertThat(html)
                .contains("href=\"https://likelion-khu.com/apply\"")
                .contains("지원하러 가기")
                .doesNotContain(">https://likelion-khu.com<");
    }

    // #113 후속(장찬욱 요청) — SMTP 실패가 매 시도 반복되면 maxAttempts까지 전부 소진한 뒤에야
    // 포기한다. 중간 시도 실패는 email_log에 안 남고(save 1회) 최종 결과만 남는지도 함께 확인.
    @Test
    void sendInviteEmail_MailServerRejectsEveryAttempt_RetriesUpToMaxAttemptsThenLogsSingleFailure() {
        String to = "invitee@khu.ac.kr";
        doThrow(new MailSendException("SMTP 서버에 연결할 수 없어요"))
                .when(mailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        verify(mailSender, times(MAX_ATTEMPTS)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getRecipient()).isEqualTo(to);
        assertThat(log.getEmailType()).isEqualTo(EmailType.INVITE);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(log.getErrorMessage()).contains("SMTP 서버에 연결할 수 없어요");
        assertThat(log.getFailureCause()).isEqualTo(FailureCause.SMTP_CONNECTION_FAILED);
        assertThat(log.getMessageId()).isNull();
    }

    // 핵심 요구사항 — 원인이 유저 이메일 문제가 아니라 일시적인 것이면(예: OCI 릴레이 순간 장애),
    // 다시 시도했을 때 결국 성공하는 케이스에선 email_log에 FAILURE가 아니라 SUCCESS 한 줄만 남아야 한다.
    @Test
    void sendInviteEmail_MailServerRejectsThenSucceeds_RetriesAndLogsOnlyFinalSuccess() throws Exception {
        String to = "invitee@khu.ac.kr";
        doThrow(new MailSendException("일시적인 SMTP 오류"))
                .doThrow(new MailSendException("일시적인 SMTP 오류"))
                .doNothing()
                .when(mailSender).send(any(MimeMessage.class));

        emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1));

        verify(mailSender, times(3)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getRecipient()).isEqualTo(to);
        assertThat(log.getStatus()).isEqualTo(EmailStatus.SUCCESS);
        assertThat(log.getErrorMessage()).isNull();
        assertThat(log.getFailureCause()).isNull();
    }

    // SMTP_AUTHENTICATION_FAILED — 자격증명 실패는 우리 쪽(인프라) 원인이지만 재시도는 안 한다.
    // OCI 문서에 "421 Too many auth failures, try again later"(반복된 인증 실패에 대한 IP 단위
    // 스로틀)가 명시돼 있어서다 — 우리가 자동으로 재시도하면 그 스로틀을 스스로 유발해 같은 IP에서
    // 나가는 다른 정상 발송까지 막을 위험이 있다. 그래서 1번만 시도하고 즉시 포기(알람은 여전히
    // 대상).
    @Test
    void sendInviteEmail_AuthenticationFails_DoesNotRetryAndClassifiesAsAuthenticationFailed() {
        String to = "invitee@khu.ac.kr";
        doThrow(new MailAuthenticationException("SMTP 인증 실패"))
                .when(mailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        verify(mailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getFailureCause()).isEqualTo(FailureCause.SMTP_AUTHENTICATION_FAILED);
    }

    // RECIPIENT_ADDRESS_REJECTED_BY_SERVER — 우리 클라이언트 쪽 InternetAddress.validate()는
    // 통과했는데, OCI가 RCPT 단계에서 자체 RFC-822 재검증 후 거부한 경우(SendFailedException, OCI
    // 문서 553 "Invalid email address") — "메일함이 없음"이 아니라 결국 같은 "주소 형식" 문제를
    // OCI가 대신 잡아준 것뿐이라 재시도해도 매번 같은 거부다. 즉시 포기.
    // 다른 5개 분류(RECIPIENT_ADDRESS_INVALID·INVALID_INPUT·TEMPLATE_RENDERING_FAILED·
    // SMTP_AUTHENTICATION_FAILED·SMTP_CONNECTION_FAILED)는 진짜 그 상황(실제 잘못된 주소, 실제
    // null 값, 실제 존재하지 않는 템플릿, 실제 SMTP AUTH 거부·연결 거부)을 만들어 실제 예외가
    // 나오는지까지 확인하는데, 이 케이스만 예외적으로 Mockito로 SendFailedException을 직접 만들어
    // 던진다 — Mailpit은 "들어오는 메일을 전부 캡처하는" 테스트 도구라 RCPT TO를 실제로 거부하는
    // 기능 자체가 없다. 그래서 이 원인만큼은 진짜 SMTP 서버로 재현할 방법이 없고, classify()가
    // SendFailedException 타입을 올바르게 인식하는지(타입 분기 로직 자체의 정확성)만 검증할 수
    // 있다 — 알려진 한계.
    @Test
    void sendInviteEmail_ServerRejectsRecipientAddress_DoesNotRetryAndClassifiesAsRejectedByServer() throws Exception {
        String to = "ghost@khu.ac.kr";
        doThrow(new MailSendException("주소 재검증 실패", new SendFailedException("553 Invalid email address")))
                .when(mailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        verify(mailSender, times(1)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getFailureCause())
                .isEqualTo(FailureCause.RECIPIENT_ADDRESS_REJECTED_BY_SERVER);
    }

    // AddressException(주소 형식 오류)은 유저 쪽 원인이라 재시도해도 결과가 똑같음 — 즉시 포기해야
    // 함(assertMalformedAddressRejected가 send() 자체가 안 불림을 이미 검증하지만, 여기선 "재시도
    // 루프를 아예 안 탄다"는 걸 명시적으로 시도 횟수 0으로 재확인).
    @Test
    void sendInviteEmail_MalformedAddress_DoesNotRetry() {
        assertThatThrownBy(() -> emailService.sendInviteEmail(
                "not-an-email-address", "https://admin.likelion-khu.com/invite?token=abc123",
                LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        verify(mailSender, never()).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository, times(1)).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getFailureCause()).isEqualTo(FailureCause.RECIPIENT_ADDRESS_INVALID);
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
        assertThat(log.getFailureCause()).isEqualTo(FailureCause.RECIPIENT_ADDRESS_INVALID);
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
        // AddressException이 아니라 NPE라 INVALID_INPUT으로 분류됨 — 재시도해도 매번 같은 NPE라
        // 재시도는 안 하지만(호출자가 준 값 자체가 안 바뀜), "우리 코드/호출자 버그"라 알람 대상이다.
        assertThat(log.getFailureCause()).isEqualTo(FailureCause.INVALID_INPUT);
        assertThat(log.getMessageId()).isNull();
    }

    // send()가 템플릿 렌더링(try 밖에 있던 시절)에서 던져지는 예외까지 email_log에 반드시 남기고
    // EmailSendException으로 통일해 던지는지 확인 — templateEngine만 이 테스트 한정으로 별도 목으로 교체.
    @Test
    void sendInviteEmail_TemplateRenderingFails_LogsFailureAndThrowsEmailSendException() {
        // mock으로 TemplateProcessingException을 직접 던지게 하는 대신, 실제 SpringTemplateEngine을
        // 존재하지 않는 템플릿 디렉터리에 연결해서 진짜 렌더링 실패를 유발한다 — "그 상황을 실제로
        // 만들었을 때 classify()가 맞게 분류하는가"를 검증(가짜 예외 객체를 손으로 만들어 던지는 것과
        // 다름). Thymeleaf가 템플릿을 못 찾으면 TemplateInputException(TemplateProcessingException의
        // 실제 하위 클래스)을 던진다.
        ClassLoaderTemplateResolver brokenResolver = new ClassLoaderTemplateResolver();
        brokenResolver.setPrefix("nonexistent-templates/");
        brokenResolver.setSuffix(".html");
        brokenResolver.setTemplateMode(TemplateMode.HTML);
        brokenResolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine brokenTemplateEngine = new SpringTemplateEngine();
        brokenTemplateEngine.setTemplateResolver(brokenResolver);

        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        EmailService serviceWithBrokenTemplate =
                new EmailService(mailSender, brokenTemplateEngine, emailLogRepository, eventPublisher, environment);
        ReflectionTestUtils.setField(serviceWithBrokenTemplate, "from", FROM);
        ReflectionTestUtils.setField(serviceWithBrokenTemplate, "maxAttempts", MAX_ATTEMPTS);
        ReflectionTestUtils.setField(serviceWithBrokenTemplate, "retryDelayMs", 0L);

        assertThatThrownBy(() -> serviceWithBrokenTemplate.sendInviteEmail(
                "invitee@khu.ac.kr", "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        // 템플릿 렌더링 단계에서 이미 터져서 실제 send() 시도까지 가지도 않음
        verify(mailSender, never()).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        EmailLog log = logCaptor.getValue();
        assertThat(log.getStatus()).isEqualTo(EmailStatus.FAILURE);
        assertThat(log.getErrorMessage()).isNotBlank();
        assertThat(log.getFailureCause()).isEqualTo(FailureCause.TEMPLATE_RENDERING_FAILED);
        assertThat(log.getMessageId()).isNull();
    }

    // UNKNOWN_FAILURE — classify()의 6가지 구체 분기 어디에도 안 걸리는, 진짜 미분류 예외를 실제로
    // 던져서 fallback이 정말로 동작하는지 확인한다(이전엔 이 분기 자체가 테스트로 커버되지 않았음).
    @Test
    void sendInviteEmail_UnclassifiedExceptionEveryAttempt_RetriesAndClassifiesAsUnknownFailure() {
        String to = "invitee@khu.ac.kr";
        doThrow(new IllegalStateException("정체불명의 오류"))
                .when(mailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> emailService.sendInviteEmail(
                to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                .isInstanceOf(EmailSendException.class);

        // UNKNOWN_FAILURE는 "안전하게" 재시도 대상 — maxAttempts까지 전부 시도한다
        verify(mailSender, times(MAX_ATTEMPTS)).send(any(MimeMessage.class));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getFailureCause()).isEqualTo(FailureCause.UNKNOWN_FAILURE);
    }

    // #85 리뷰(신선우) + SQLite 커넥션 풀 실측 재현 — 활성 트랜잭션 안에서 부르면 email_log를 직접
    // save()하지 않고 EmailLogEvent를 발행해야 한다(왜 그런지는 EmailService.recordSuccess() 주석 참고).
    // TransactionSynchronizationManager를 직접 조작해서 실제 DB·Spring 컨텍스트 없이도 "트랜잭션이
    // 활성 상태"라는 조건만 순수 단위테스트로 재현한다 — 통합 버전은
    // EmailServiceFailureTransactionBoundaryIntegrationTest / EmailServiceIntegrationTest.
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

    // 위 테스트의 실패 경로 버전 — 성공만 이벤트로 가고 실패는 예전처럼 직접 save()하는 식으로
    // 갈라져 있으면 안 되므로, 실패 쪽도 똑같이 이벤트를 타는지 별도로 확인해야 함.
    @Test
    void send_MailServerRejectsWithActiveTransaction_PublishesFailureEventInsteadOfSavingDirectly() {
        doThrow(new MailSendException("SMTP 서버에 연결할 수 없어요"))
                .when(mailSender).send(any(MimeMessage.class));

        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            String to = "invitee@khu.ac.kr";
            assertThatThrownBy(() -> emailService.sendInviteEmail(
                    to, "https://admin.likelion-khu.com/invite?token=abc123", LocalDateTime.now().plusDays(1)))
                    .isInstanceOf(EmailSendException.class);

            verify(emailLogRepository, never()).save(any());

            ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            EmailLogEvent event = (EmailLogEvent) eventCaptor.getValue();
            assertThat(event.recipient()).isEqualTo(to);
            assertThat(event.status()).isEqualTo(EmailStatus.FAILURE);
            assertThat(event.errorMessage()).contains("SMTP 서버에 연결할 수 없어요");
            assertThat(event.failureCause()).isEqualTo(FailureCause.SMTP_CONNECTION_FAILED);
        } finally {
            TransactionSynchronizationManager.setActualTransactionActive(false);
        }
    }
}
