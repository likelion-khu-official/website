package likelion.khu.website.admin.exception;

public class HandoverTargetNotAdminException extends RuntimeException {
    public HandoverTargetNotAdminException() {
        super("운영진(ADMIN)에게만 최고관리자를 넘길 수 있어요.");
    }
}
