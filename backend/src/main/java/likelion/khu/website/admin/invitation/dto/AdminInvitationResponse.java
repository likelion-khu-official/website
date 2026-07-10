package likelion.khu.website.admin.invitation.dto;

import likelion.khu.website.admin.invitation.AdminInvitation;
import likelion.khu.website.admin.invitation.InvitationStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class AdminInvitationResponse {
    private Long id;
    private String email;
    private String status;
    private String invitedBy;
    private LocalDateTime expiresAt;

    // EXPIRED는 저장값이 아니라 PENDING이면서 만료된 경우에만 응답 시점에 파생시킨다
    // (MagicLinkTokenService.checkStatus가 USED/EXPIRED를 파생시키는 것과 동일한 결).
    public static AdminInvitationResponse from(AdminInvitation invitation) {
        String status = invitation.getStatus().name();
        if (invitation.getStatus() == InvitationStatus.PENDING && invitation.isExpired()) {
            status = "EXPIRED";
        }
        return new AdminInvitationResponse(
                invitation.getId(),
                invitation.getEmail(),
                status,
                invitation.getInvitedByEmail(),
                invitation.getExpiresAt());
    }
}
