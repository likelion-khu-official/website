package likelion.khu.website.admin.exception;

public class InvalidRefreshTokenException extends RuntimeException {
    public InvalidRefreshTokenException() {
        super("인증이 만료됐어요. 다시 로그인해주세요.");
    }
}
