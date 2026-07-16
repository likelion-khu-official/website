package likelion.khu.website.project.dto;

import likelion.khu.website.project.ProjectImage;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ProjectImageResponse {
    // DELETE /api/projects/{id}/images/{imageId}가 이 id를 받는다 — 응답에 없으면
    // 클라이언트가 어떤 이미지를 지울지 가리킬 방법이 없다.
    private Long id;
    private String url;
    private boolean representative;

    public static ProjectImageResponse from(ProjectImage image) {
        return new ProjectImageResponse(image.getId(), image.getUrl(), image.isRepresentative());
    }
}
