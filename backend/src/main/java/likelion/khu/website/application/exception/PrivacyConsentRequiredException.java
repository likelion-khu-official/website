package likelion.khu.website.application.exception;

// 개인정보 수집·이용 동의 없이 제출을 시도했을 때(#152). 400으로 매핑(GlobalExceptionHandler).
public class PrivacyConsentRequiredException extends RuntimeException {
    public PrivacyConsentRequiredException() {
        super("개인정보 수집·이용에 동의해야 지원할 수 있어요.");
    }
}
