package likelion.khu.website.project.dto;

import likelion.khu.website.project.ProjectImage;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ProjectImageResponse {
    private String url;
    private boolean representative;

    public static ProjectImageResponse from(ProjectImage image) {
        return new ProjectImageResponse(image.getUrl(), image.isRepresentative());
    }
}
