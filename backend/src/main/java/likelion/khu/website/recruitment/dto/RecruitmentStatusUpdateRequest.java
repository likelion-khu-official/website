package likelion.khu.website.recruitment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RecruitmentStatusUpdateRequest {

    @NotNull(message = "open 값을 보내주세요.")
    private Boolean open;
}
