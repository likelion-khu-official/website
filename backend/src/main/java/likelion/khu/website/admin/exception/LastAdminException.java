package likelion.khu.website.admin.exception;

public class LastAdminException extends RuntimeException {
    public LastAdminException() {
        super("마지막 남은 관리자는 삭제할 수 없어요.");
    }
}
