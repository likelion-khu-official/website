package likelion.khu.website.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectImageRepository extends JpaRepository<ProjectImage, Long> {
    List<ProjectImage> findAllByProjectIdOrderByIdAsc(Long projectId);

    void deleteAllByProjectId(Long projectId);
}
