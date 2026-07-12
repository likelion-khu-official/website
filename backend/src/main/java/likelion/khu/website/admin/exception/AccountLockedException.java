package likelion.khu.website.admin.exception;

public class AccountLockedException extends RuntimeException {
    public AccountLockedException() {
        super("로그인 시도가 너무 많아 계정이 잠겼어요. 잠시 후 다시 시도해주세요.");
    }
}
