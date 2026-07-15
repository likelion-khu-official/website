package likelion.khu.website.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findAllByHiddenFalseOrderByCreatedAtDesc();

    Optional<Project> findByIdAndHiddenFalse(Long id);
}
