package likelion.khu.website.admin.management.dto;

import likelion.khu.website.admin.Admin;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminRoleUpdateResponse {
    private Long id;
    private String role;

    public static AdminRoleUpdateResponse from(Admin admin) {
        return new AdminRoleUpdateResponse(admin.getId(), admin.getRole().name());
    }
}
