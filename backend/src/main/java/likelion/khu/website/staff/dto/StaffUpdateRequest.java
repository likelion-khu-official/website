package likelion.khu.website.staff.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// 이름·학과·학번은 스코프 밖 — 등록 후 못 바꿈
@Getter
@Setter
public class StaffUpdateRequest {

    @Size(min = 1)
    private String position;

    @Size(min = 1)
    private String photoUrl;

    private String introduction;

    private Integer sortOrder;
}