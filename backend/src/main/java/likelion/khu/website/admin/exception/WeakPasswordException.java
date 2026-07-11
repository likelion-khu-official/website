package likelion.khu.website.admin.exception;

public class WeakPasswordException extends RuntimeException {
    public WeakPasswordException() {
        super("비밀번호는 8자 이상, 영문과 숫자를 포함해야 해요.");
    }
}
