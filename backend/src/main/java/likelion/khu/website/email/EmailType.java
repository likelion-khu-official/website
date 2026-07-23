package likelion.khu.website.email;

// EmailService 등 다른 패키지에서 메일 종류를 지정해야 해서 public.
// 상수 뒤 괄호는 함수 호출이 아니라 생성자 호출 — INVITE/PASSWORD_RESET은 각각 이 값으로 만들어진 EmailType 인스턴스.
// 새 메일 종류가 생기면 이 목록에 한 줄 추가하는 식으로 확장.
public enum EmailType {

    INVITE("email/invite", "[멋쟁이사자처럼 경희대] 운영진 초대"),
    PASSWORD_RESET("email/password-reset", "[멋쟁이사자처럼 경희대] 비밀번호 재설정"),
    RECRUITMENT_OPEN("email/recruitment-open", "[멋쟁이사자처럼 경희대] 모집이 시작됐어요!");

    private final String templateName; // Thymeleaf 템플릿 경로
    private final String subject; // 메일 제목(Subject 헤더) — final: 생성자에서 한 번 세팅되면 이후 불변

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
