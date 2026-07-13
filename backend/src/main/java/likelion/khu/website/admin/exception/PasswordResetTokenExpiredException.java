package likelion.khu.website.admin.exception;

public class PasswordResetTokenExpiredException extends RuntimeException {
    public PasswordResetTokenExpiredException() {
        super("만료된 재설정 링크예요.");
    }
}
