package likelion.khu.website.admin.exception;

public class AdminInvitationAlreadyProcessedException extends RuntimeException {
    public AdminInvitationAlreadyProcessedException() {
        super("이미 처리된 초대예요.");
    }
}
