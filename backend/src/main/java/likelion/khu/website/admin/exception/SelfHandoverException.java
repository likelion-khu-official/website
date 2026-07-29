package likelion.khu.website.admin.exception;

public class SelfHandoverException extends RuntimeException {
    public SelfHandoverException() {
        super("자기 자신에게는 최고관리자를 넘길 수 없어요.");
    }
}
