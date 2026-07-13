package likelion.khu.website.admin.exception;

public class AdminInvitationExpiredException extends RuntimeException {
    public AdminInvitationExpiredException() {
        super("만료된 초대예요.");
    }
}
