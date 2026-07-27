package likelion.khu.website.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectParticipantRepository extends JpaRepository<ProjectParticipant, Long> {

    @Query("select p from ProjectParticipant p join fetch p.member where p.project.id = :projectId order by p.id asc")
    List<ProjectParticipant> findAllByProjectIdWithMember(Long projectId);

    @Query("""
            select distinct p.project
            from ProjectParticipant p
            where p.member.id = :memberId
            order by p.project.createdAt desc
            """)
    List<Project> findProjectsByMemberId(@Param("memberId") Long memberId);

    boolean existsByProjectIdAndMemberId(Long projectId, Long memberId);

    void deleteAllByProjectId(Long projectId);
}
