package likelion.khu.website.project.dto;

import likelion.khu.website.project.Project;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Set;

@Getter
@AllArgsConstructor
public class ProjectSummaryResponse {
    private Long id;
    private String title;
    private String summary;
    private String representativeImageUrl;
    private Integer cohort;
    private Set<String> techStack;

    // representativeImageUrl은 자식 테이블(ProjectImage)에서 오는 값이라 엔티티만으론 못 만들고 서비스가 조립해 넘긴다.
    public static ProjectSummaryResponse from(Project project, String representativeImageUrl) {
        return new ProjectSummaryResponse(
                project.getId(), project.getTitle(), project.getSummary(),
                representativeImageUrl, project.getCohort(), project.getTechStack());
    }
}
