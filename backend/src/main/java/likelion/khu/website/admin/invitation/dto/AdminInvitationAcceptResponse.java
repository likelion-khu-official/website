package likelion.khu.website.admin.invitation.dto;

import likelion.khu.website.admin.Admin;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminInvitationAcceptResponse {
    private Long id;
    private String email;
    private String role;

    public static AdminInvitationAcceptResponse from(Admin admin) {
        return new AdminInvitationAcceptResponse(admin.getId(), admin.getEmail(), admin.getRole().name());
    }
}
