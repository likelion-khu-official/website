package likelion.khu.website.recruitment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RecruitmentRoundRepository extends JpaRepository<RecruitmentRound, Long> {
    Optional<RecruitmentRound> findTopByOrderByOpenedAtDesc();
}
