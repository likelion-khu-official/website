package likelion.khu.website.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectImageRepository extends JpaRepository<ProjectImage, Long> {
    List<ProjectImage> findAllByProjectIdOrderByIdAsc(Long projectId);

    // 이미지 개별 삭제 시 다른 프로젝트 소속 이미지를 잘못 지우지 않게 projectId까지 같이 확인한다.
    Optional<ProjectImage> findByIdAndProjectId(Long id, Long projectId);

    void deleteAllByProjectId(Long projectId);
}
