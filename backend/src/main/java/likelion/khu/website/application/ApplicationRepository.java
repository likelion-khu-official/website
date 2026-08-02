package likelion.khu.website.application;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    // 관리자 열람 — 최신 지원자가 위로.
    List<Application> findAllByOrderBySubmittedAtDesc();

    long countByRecruitmentRoundId(Long recruitmentRoundId);
}
