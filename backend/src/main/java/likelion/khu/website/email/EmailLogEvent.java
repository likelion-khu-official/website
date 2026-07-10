package likelion.khu.website.email;

// email_log 저장에 필요한 값만 담아 옮기는 이벤트 페이로드. EmailLogEventListener가 트랜잭션 완료
// "이후"(별도 스레드)에 이 값으로 EmailLog를 만들어 저장한다 — 왜 필요한지는 EmailLogEventListener 참고.
record EmailLogEvent(String recipient, EmailType emailType, String subject, EmailStatus status,
                      String errorMessage, String messageId) {

    static EmailLogEvent success(String recipient, EmailType emailType, String subject, String messageId) {
        return new EmailLogEvent(recipient, emailType, subject, EmailStatus.SUCCESS, null, messageId);
    }

    static EmailLogEvent failure(String recipient, EmailType emailType, String subject,
                                  String errorMessage, String messageId) {
        return new EmailLogEvent(recipient, emailType, subject, EmailStatus.FAILURE, errorMessage, messageId);
    }

    EmailLog toEmailLog() {
        return status == EmailStatus.SUCCESS
                ? EmailLog.success(recipient, emailType, subject, messageId)
                : EmailLog.failure(recipient, emailType, subject, errorMessage, messageId);
    }
}
