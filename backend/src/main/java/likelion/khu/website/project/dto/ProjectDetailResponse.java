package likelion.khu.website.project.dto;

import likelion.khu.website.project.Project;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Getter
@AllArgsConstructor
public class ProjectDetailResponse {
    private Long id;
    private String title;
    private String summary;
    private List<ProjectImageResponse> images;
    private List<ProjectParticipantResponse> participants;
    private Integer cohort;
    private LocalDate startDate;
    private LocalDate endDate;
    private Set<String> techStack;
    private String githubUrl;
    private boolean hidden;

    public static ProjectDetailResponse from(Project project, List<ProjectImageResponse> images,
                                              List<ProjectParticipantResponse> participants) {
        return new ProjectDetailResponse(
                project.getId(), project.getTitle(), project.getSummary(), images, participants,
                project.getCohort(), project.getStartDate(), project.getEndDate(),
                project.getTechStack(), project.getGithubUrl(), project.isHidden());
    }
}
