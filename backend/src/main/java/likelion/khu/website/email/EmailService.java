package likelion.khu.website.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import likelion.khu.website.email.exception.EmailSendException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
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
    // @RequiredArgsConstructor(Lombok)가 이 네 final 필드만 받는 생성자를 자동 생성 — 직접 안 써도 됨.
    // 스프링이 타입으로 매칭해 각 빈을 주입(지금은 타입별 후보가 1개씩이라 @Qualifier 불필요).
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final EmailLogRepository emailLogRepository;
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
            emailLogRepository.save(EmailLog.success(to, type, subject, messageIdOf(message)));
        } catch (Exception e) {
            logFailureSafely(to, type, subject, message, e);
            throw new EmailSendException(type, to, e);
        }
    }

    // 실패 로그 저장 자체가 또 실패하는 경우(예: DB 커넥션 자체가 죽음)를 대비 — 여기서 예외를 삼켜서
    // send()의 catch가 원래 원인(cause)을 담은 EmailSendException을 반드시 던지도록 보장.
    // (이 로그 저장을 못 하면 email_log엔 안 남지만, 호출자에게 실패를 알리는 것 자체는 절대 놓치지 않음)
    private void logFailureSafely(String to, EmailType type, String subject, MimeMessage message, Exception cause) {
        try {
            emailLogRepository.save(EmailLog.failure(to, type, subject, cause.getMessage(), messageIdOf(message)));
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
