package likelion.khu.website.admin.management.dto;

import likelion.khu.website.admin.Admin;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminSummaryResponse {
    private Long id;
    private String email;
    private String name;
    private String role;
    private String status;

    // status는 저장값이 아니라 isLocked() 파생값 — ACTIVE/LOCKED
    public static AdminSummaryResponse from(Admin admin) {
        return new AdminSummaryResponse(
                admin.getId(), admin.getEmail(), admin.getName(), admin.getRole().name(),
                admin.isLocked() ? "LOCKED" : "ACTIVE");
    }
}
