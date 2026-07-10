package likelion.khu.website.admin.management.dto;

import jakarta.validation.constraints.NotNull;
import likelion.khu.website.admin.AdminRole;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminRoleUpdateRequest {

    @NotNull(message = "역할을 입력해주세요.")
    private AdminRole role;
}
