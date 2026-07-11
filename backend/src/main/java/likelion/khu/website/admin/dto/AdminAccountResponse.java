package likelion.khu.website.admin.dto;

import likelion.khu.website.admin.Admin;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminAccountResponse {
    private Long id;
    private String email;
    private String name;
    private String role;

    public static AdminAccountResponse from(Admin admin) {
        return new AdminAccountResponse(admin.getId(), admin.getEmail(), admin.getName(), admin.getRole().name());
    }
}
