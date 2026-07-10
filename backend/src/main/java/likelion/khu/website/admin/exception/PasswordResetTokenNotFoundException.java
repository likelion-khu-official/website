package likelion.khu.website.admin.exception;

public class PasswordResetTokenNotFoundException extends RuntimeException {
    public PasswordResetTokenNotFoundException() {
        super("존재하지 않는 재설정 링크예요.");
    }
}
