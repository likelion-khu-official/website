package likelion.khu.website.admin.exception;

public class LastSuperAdminException extends RuntimeException {
    public LastSuperAdminException() {
        super("마지막 남은 최고관리자는 제외하거나 강등할 수 없어요.");
    }
}
