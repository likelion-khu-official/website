package likelion.khu.website.project.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Getter
@Setter
public class ProjectCreateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String summary;

    @NotNull
    private Integer cohort;

    private Set<String> techStack;

    private String githubUrl;

    private LocalDate startDate;

    private LocalDate endDate;

    private List<@Valid ProjectImageRequest> images;

    // 등록하는 본인도 여기 포함돼 있어야 한다(ProjectService가 검증) — "본인 참여 프로젝트만" 원칙의 뿌리.
    @NotEmpty
    private List<@Valid ProjectParticipantRequest> participants;
}
