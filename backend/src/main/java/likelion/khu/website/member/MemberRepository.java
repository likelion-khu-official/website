package likelion.khu.website.member;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    List<Member> findAllByOrderByCreatedAtAsc();

    List<Member> findAllByPublicationConsentTrueAndOffboardedAtIsNullOrderByCreatedAtAsc();

    // 학번은 (학번, 기수) 유니크라 한 학번이 여러 row(재입부 이력)를 가질 수 있다 — 그래서
    // Optional이 아니라 List. 활동 중인 계정 딱 하나가 필요하면 findByStudentIdAndOffboardedAtIsNull을
    // 대신 쓸 것(둘 이상이 나올 수 있는 곳에서 Optional/단일 엔티티로 받으면
    // IncorrectResultSizeDataAccessException으로 터진다).
    List<Member> findAllByStudentId(String studentId);

    // 로그인 조회용. 학번은 (학번, 기수) 유니크라 오프보딩된 과거 기수 row가 같이 남아있을 수 있어
    // 활동 중(offboardedAt = null) 계정 하나로 좁힌다(#145 PR 리뷰). "동시에 두 기수 활동 불가"
    // 불변식이 MemberService.create()에서 지켜지는 한 이 조회는 항상 0개 또는 1개다.
    Optional<Member> findByStudentIdAndOffboardedAtIsNull(String studentId);

    // 재입부 허용: 같은 학번이라도 기수가 다르면 새 row를 만들 수 있다.
    boolean existsByStudentIdAndCohort(String studentId, Integer cohort);

    // 같은 학번으로 이미 활동 중인 계정이 있는지 — 있으면 기수와 무관하게 등록을 막는다
    // (한 사람이 동시에 두 기수로 활동 중일 수는 없다).
    boolean existsByStudentIdAndOffboardedAtIsNull(String studentId);
}
