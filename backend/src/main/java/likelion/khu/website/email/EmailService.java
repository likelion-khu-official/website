package likelion.khu.website.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import likelion.khu.website.email.exception.EmailSendException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final DateTimeFormatter DISPLAY_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");
    // stage·prod가 발신주소·DKIM을 공유해 실제 수신자가 테스트/실사용을 헷갈릴 수 있어 stage 발송에만 붙임 (infra 요청, #75)
    private static final String STAGE_SUBJECT_PREFIX = "[stage] ";

    // final + private: 생성자 주입 이후 재할당 불가(불변) + 외부에 노출 안 하는 내부 협력 객체.
    // @RequiredArgsConstructor(Lombok)가 이 다섯 final 필드만 받는 생성자를 자동 생성 — 직접 안 써도 됨.
    // 스프링이 타입으로 매칭해 각 빈을 주입(지금은 타입별 후보가 1개씩이라 @Qualifier 불필요).
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final EmailLogRepository emailLogRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Environment environment;

    // final이 아니라 필드 주입 — @Value는 빈이 아니라 프로퍼티 값이라 생성자 파라미터로 묶기 번거로워 예외적으로 이 방식 사용.
    @Value("${mail-sender.from}")
    private String from;

    // inviteUrl·expiresAt은 이 메서드가 만드는 게 아니라 호출자가 넘겨야 하는 값 — 아직 그 호출자(#74 초대 기능)가 없어
    // 지금은 EmailService 스스로 "무엇을 보낼지"는 모르고 "어떻게 보낼지"만 담당하는 상태.
    // Context는 Thymeleaf 템플릿에 넘길 변수 바구니 — 여기 담은 값이 템플릿의 ${inviteUrl} 등으로 치환됨.
    public void sendInviteEmail(String to, String inviteUrl, LocalDateTime expiresAt) {
        Context context = new Context();
        context.setVariable("inviteUrl", inviteUrl);
        context.setVariable("expiresAt", DISPLAY_FORMAT.format(expiresAt));
        send(to, EmailType.INVITE, context);
    }

    public void sendPasswordResetEmail(String to, String resetUrl, LocalDateTime expiresAt) {
        Context context = new Context();
        context.setVariable("resetUrl", resetUrl);
        context.setVariable("expiresAt", DISPLAY_FORMAT.format(expiresAt));
        send(to, EmailType.PASSWORD_RESET, context);
    }

    // 제목 결정만 try 밖 — 실패해도 로그에 subject가 필요해서 미리 확보(subjectFor 자체는 예외 던질 일 없음).
    // 그 외(템플릿 렌더링·메일 객체 생성·주소검증·전송·로그저장)는 전부 try 안 — "무슨 예외가 나든 반드시
    // email_log에 한 줄 남기고 EmailSendException으로 통일해서 던진다"는 불변식을 구조로 강제하기 위함.
    // catch (Exception e)로 넓게 잡는 이유: MessagingException/MailException뿐 아니라 Thymeleaf 렌더링 예외,
    // to가 null일 때 InternetAddress가 던질 수 있는 NullPointerException까지 전부 이 불변식 아래 두기 위한 의도적 선택.
    private void send(String to, EmailType type, Context context) {
        String subject = subjectFor(type);
        MimeMessage message = null;
        try {
            message = mailSender.createMimeMessage();
            String html = templateEngine.process(type.getTemplateName(), context);

            // MimeMessageHelper.setTo(String)만으로는 느슨한 파싱만 돼서 "not-an-email-address" 같은
            // 형식 오류를 그냥 통과시킴 — validate()로 RFC 문법을 실제로 검사해야 여기서 걸러짐
            InternetAddress toAddress = new InternetAddress(to);
            toAddress.validate();

            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(toAddress);
            helper.setFrom(from);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            recordSuccess(to, type, subject, messageIdOf(message));
        } catch (Exception e) {
            recordFailureSafely(to, type, subject, message, e);
            throw new EmailSendException(type, to, e);
        }
    }

    // 활성 트랜잭션 여부로 저장 경로를 나누는 이유(#85 리뷰, 신선우 + SQLite 커넥션 풀 실측):
    // 호출자가 @Transactional 메서드 안에서 이 메서드를 부르면(예: 미래의 #74가 토큰 저장과 한
    // 트랜잭션으로 묶는 경우), email_log 기록이 그 트랜잭션의 롤백에 함께 휩쓸려 사라질 수 있다.
    // REQUIRES_NEW로 별도 트랜잭션을 열어 이 문제를 막으려 했으나, 이 프로젝트는 SQLite 특성상
    // HikariCP 커넥션 풀이 1개로 고정돼 있어(application.yml) 바깥 트랜잭션이 그 하나를 붙잡은 채
    // REQUIRES_NEW가 같은 스레드에서 새 커넥션을 요청하면 서로를 기다리다 데드락/타임아웃 나는 걸
    // CI에서 실측했다(풀을 늘려도 SQLite 자체가 동시 쓰기 2개를 못 버텨 근본 해결 안 됨).
    //
    // 대신 이벤트 발행 후 별도 스레드(@Async)에서 트랜잭션 완료 뒤에 저장하는 방식(EmailLogEventListener)으로
    // 우회한다 — 원래 스레드는 우리를 기다리지 않고 바로 커넥션을 반납하므로 순환 대기가 안 생긴다.
    // 활성 트랜잭션이 없을 때(지금까지의 모든 호출 경로)는 예전처럼 그 자리에서 즉시 저장 — 굳이
    // 비동기로 돌릴 이유가 없고, 기존 동작(테스트 포함)을 그대로 유지한다.
    private void recordSuccess(String to, EmailType type, String subject, String messageId) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            eventPublisher.publishEvent(EmailLogEvent.success(to, type, subject, messageId));
        } else {
            emailLogRepository.save(EmailLog.success(to, type, subject, messageId));
        }
    }

    // 실패 로그 저장 자체가 또 실패하는 경우(예: DB 커넥션 자체가 죽음)를 대비 — 여기서 예외를 삼켜서
    // send()의 catch가 원래 원인(cause)을 담은 EmailSendException을 반드시 던지도록 보장.
    // (이 로그 저장을 못 하면 email_log엔 안 남지만, 호출자에게 실패를 알리는 것 자체는 절대 놓치지 않음)
    private void recordFailureSafely(String to, EmailType type, String subject, MimeMessage message, Exception cause) {
        try {
            String messageId = messageIdOf(message);
            if (TransactionSynchronizationManager.isActualTransactionActive()) {
                eventPublisher.publishEvent(EmailLogEvent.failure(to, type, subject, cause.getMessage(), messageId));
            } else {
                emailLogRepository.save(EmailLog.failure(to, type, subject, cause.getMessage(), messageId));
            }
        } catch (Exception loggingFailure) {
            // 의도적으로 무시 — 로깅 실패로 원래 예외 전파(EmailSendException)가 막히면 안 됨
        }
    }

    /** send() 성공 여부와 무관하게 호출 — saveChanges()가 실행된 적 없으면(주소·제목 세팅 단계 실패 등) null. */
    // message가 null(createMimeMessage() 자체가 실패한 극단 케이스)이거나 catch에서 새 예외가 나도
    // 원래 하려던 실패 기록 자체가 끊기면 안 되므로 항상 null로 안전하게 반환.
    private String messageIdOf(MimeMessage message) {
        if (message == null) {
            return null;
        }
        try {
            return message.getMessageID();
        } catch (MessagingException e) {
            return null;
        }
    }

    private String subjectFor(EmailType type) {
        if (environment.acceptsProfiles(Profiles.of("stage"))) {
            return STAGE_SUBJECT_PREFIX + type.getSubject();
        }
        return type.getSubject();
    }
}
