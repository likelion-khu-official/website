package likelion.khu.website.project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectImageRequest {

    @NotBlank
    private String url;

    private boolean representative;
}
