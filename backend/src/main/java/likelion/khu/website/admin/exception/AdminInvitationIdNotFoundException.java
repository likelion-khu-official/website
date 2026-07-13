package likelion.khu.website.admin.exception;

// AdminInvitationNotFoundException(토큰 조회 실패, 400 INVALID_TOKEN)과 별개 —
// id로 조회하는 취소(cancel) 흐름은 #90 스펙상 404 NOT_FOUND가 맞다.
public class AdminInvitationIdNotFoundException extends RuntimeException {
    public AdminInvitationIdNotFoundException() {
        super("존재하지 않는 초대예요.");
    }
}
