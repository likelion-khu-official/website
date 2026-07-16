package likelion.khu.website.project.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Set;

// Member/Post와 같은 부분 수정 관례 — null이면 그 필드는 안 바뀐다.
// images/participants는 여기 없다 — 통째 교체 대신 하위 리소스 엔드포인트로 개별 추가·삭제한다
// (POST/DELETE /api/projects/{id}/images, /api/projects/{id}/participants).
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
}
