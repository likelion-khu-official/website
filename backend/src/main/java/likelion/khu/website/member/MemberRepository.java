package likelion.khu.website.member;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    List<Member> findAllByOrderByCreatedAtAsc();

    Optional<Member> findByStudentId(String studentId);

    // 로그인 조회용. 학번은 (학번, 기수) 유니크라 오프보딩된 과거 기수 row가 같이 남아있을 수 있어
    // 활동 중(offboardedAt = null) 계정 하나로 좁힌다(#145 PR 리뷰).
    Optional<Member> findByStudentIdAndOffboardedAtIsNull(String studentId);

    // 재입부 허용: 같은 학번이라도 기수가 다르면 새 row를 만들 수 있다.
    boolean existsByStudentIdAndCohort(String studentId, Integer cohort);

    // 같은 학번으로 이미 활동 중인 계정이 있는지 — 있으면 기수와 무관하게 등록을 막는다
    // (한 사람이 동시에 두 기수로 활동 중일 수는 없다).
    boolean existsByStudentIdAndOffboardedAtIsNull(String studentId);
}
