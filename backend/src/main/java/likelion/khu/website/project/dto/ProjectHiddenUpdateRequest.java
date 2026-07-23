package likelion.khu.website.project.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectHiddenUpdateRequest {

    @NotNull
    private Boolean hidden;
}
