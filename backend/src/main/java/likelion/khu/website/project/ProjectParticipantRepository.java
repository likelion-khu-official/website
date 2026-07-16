package likelion.khu.website.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProjectParticipantRepository extends JpaRepository<ProjectParticipant, Long> {

    @Query("select p from ProjectParticipant p join fetch p.member where p.project.id = :projectId order by p.id asc")
    List<ProjectParticipant> findAllByProjectIdWithMember(Long projectId);

    boolean existsByProjectIdAndMemberId(Long projectId, Long memberId);

    // 참여자 개별 삭제 시 다른 프로젝트 소속 참여자 행을 잘못 지우지 않게 projectId까지 같이 확인한다.
    Optional<ProjectParticipant> findByIdAndProjectId(Long id, Long projectId);

    long countByProjectId(Long projectId);

    void deleteAllByProjectId(Long projectId);
}
