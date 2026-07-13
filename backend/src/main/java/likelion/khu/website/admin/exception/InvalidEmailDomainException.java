package likelion.khu.website.admin.exception;

public class InvalidEmailDomainException extends RuntimeException {
    public InvalidEmailDomainException() {
        super("khu.ac.kr 이메일만 초대할 수 있어요.");
    }
}
