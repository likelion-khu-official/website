package likelion.khu.website.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import likelion.khu.website.email.exception.EmailSendException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.MailException;
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
    private static final String STAGE_SUBJECT_PREFIX = "[STAGE 테스트] ";

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final EmailLogRepository emailLogRepository;
    private final Environment environment;

    @Value("${mail-sender.from}")
    private String from;

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

    private void send(String to, EmailType type, Context context) {
        String html = templateEngine.process(type.getTemplateName(), context);
        String subject = subjectFor(type);
        MimeMessage message = mailSender.createMimeMessage();
        try {
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
        } catch (MessagingException | MailException e) {
            emailLogRepository.save(EmailLog.failure(to, type, subject, e.getMessage(), messageIdOf(message)));
            throw new EmailSendException(type, to, e);
        }
    }

    /** send() 성공 여부와 무관하게 호출 — saveChanges()가 실행된 적 없으면(주소·제목 세팅 단계 실패 등) null. */
    private String messageIdOf(MimeMessage message) {
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
