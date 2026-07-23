package likelion.khu.website.admin.exception;

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("이메일 또는 비밀번호가 올바르지 않아요.");
    }

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
