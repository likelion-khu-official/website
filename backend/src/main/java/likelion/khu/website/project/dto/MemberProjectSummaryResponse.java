package likelion.khu.website.project.dto;

import likelion.khu.website.project.Project;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Set;

@Getter
@AllArgsConstructor
public class MemberProjectSummaryResponse {
    private Long id;
    private String title;
    private String summary;
    private String representativeImageUrl;
    private Integer cohort;
    private Set<String> techStack;
    private boolean hidden;

    public static MemberProjectSummaryResponse from(Project project, String representativeImageUrl) {
        return new MemberProjectSummaryResponse(
                project.getId(),
                project.getTitle(),
                project.getSummary(),
                representativeImageUrl,
                project.getCohort(),
                project.getTechStack(),
                project.isHidden()
        );
    }
}
