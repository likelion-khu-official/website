package likelion.khu.website.email.exception;

import likelion.khu.website.email.EmailType;

public class EmailSendException extends RuntimeException {

    public EmailSendException(EmailType type, String recipient, Throwable cause) {
        super("메일 발송 실패 (종류: " + type + ", 수신자: " + recipient + ")", cause);
    }
}
