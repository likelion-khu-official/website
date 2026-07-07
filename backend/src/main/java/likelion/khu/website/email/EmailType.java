package likelion.khu.website.email;

public enum EmailType {

    INVITE("email/invite", "[멋쟁이사자처럼 경희대] 운영진 초대"),
    PASSWORD_RESET("email/password-reset", "[멋쟁이사자처럼 경희대] 비밀번호 재설정");

    private final String templateName;
    private final String subject;

    EmailType(String templateName, String subject) {
        this.templateName = templateName;
        this.subject = subject;
    }

    public String getTemplateName() {
        return templateName;
    }

    public String getSubject() {
        return subject;
    }
}
