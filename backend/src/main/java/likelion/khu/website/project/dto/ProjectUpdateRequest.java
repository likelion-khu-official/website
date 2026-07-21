package likelion.khu.website.project.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

// Member/Post와 같은 부분 수정 관례 — null이면 그 필드는 안 바뀐다. images/participants는 넘기면 전체 교체.
@Getter
@Setter
public class ProjectUpdateRequest {

    @Size(min = 1)
    private String title;

    @Size(min = 1)
    private String summary;

    private Set<String> techStack;

    private String githubUrl;

    private LocalDate startDate;

    private LocalDate endDate;

    private List<@Valid ProjectImageRequest> images;

    private List<@Valid ProjectParticipantRequest> participants;
}
