package likelion.khu.website.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findAllByHiddenFalseOrderByCreatedAtDesc(Pageable pageable);

    Optional<Project> findByIdAndHiddenFalse(Long id);
}
