package likelion.khu.website.admin.management.dto;

import likelion.khu.website.admin.Admin;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminHandoverResponse {
    private AdminSummaryResponse newSuperAdmin;
    private AdminSummaryResponse formerSuperAdmin;

    public static AdminHandoverResponse of(Admin newSuperAdmin, Admin formerSuperAdmin) {
        return new AdminHandoverResponse(
                AdminSummaryResponse.from(newSuperAdmin),
                AdminSummaryResponse.from(formerSuperAdmin));
    }
}
