package likelion.khu.website.admin.dto;

import likelion.khu.website.admin.Admin;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminSessionResponse {
    private AdminAccountResponse admin;

    public static AdminSessionResponse from(Admin admin) {
        return new AdminSessionResponse(AdminAccountResponse.from(admin));
    }
}
