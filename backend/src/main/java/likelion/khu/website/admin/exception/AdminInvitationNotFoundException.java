package likelion.khu.website.admin.exception;

public class AdminInvitationNotFoundException extends RuntimeException {
    public AdminInvitationNotFoundException() {
        super("존재하지 않는 초대예요.");
    }
}
