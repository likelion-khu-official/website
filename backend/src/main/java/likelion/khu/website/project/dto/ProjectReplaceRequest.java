package likelion.khu.website.project.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Getter
@Setter
public class ProjectReplaceRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String summary;

    @NotNull
    private Set<String> techStack;

    private String githubUrl;

    private LocalDate startDate;

    private LocalDate endDate;

    @NotNull
    private List<@Valid ProjectImageRequest> images;

    @NotNull
    private List<@Valid ProjectParticipantRequest> participants;
}
