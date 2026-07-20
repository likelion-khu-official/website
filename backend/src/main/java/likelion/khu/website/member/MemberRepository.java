package likelion.khu.website.member;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    List<Member> findAllByOrderByCreatedAtAsc();

    Optional<Member> findByStudentId(String studentId);

    boolean existsByStudentId(String studentId);
}
