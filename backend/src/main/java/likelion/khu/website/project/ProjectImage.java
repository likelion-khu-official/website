package likelion.khu.website.project;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

// url은 이 이미지를 담을 프로젝트 자체가 아니라 /api/feed/images(기존 OCI 업로드 엔드포인트, #75)로
// 먼저 업로드해서 받은 결과 — Post.thumbnailUrl·Member.photoUrl과 같은 패턴.
@Entity
@Table(name = "project_images")
@Getter
@NoArgsConstructor
public class ProjectImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String url;

    // 목록 카드엔 대표 이미지만 노출 — 정확히 1장만 true여야 한다(ProjectService가 검증).
    @Column(nullable = false)
    private boolean representative;

    public static ProjectImage create(Project project, String url, boolean representative) {
        ProjectImage image = new ProjectImage();
        image.project = project;
        image.url = url;
        image.representative = representative;
        return image;
    }
}
