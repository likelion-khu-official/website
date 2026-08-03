package likelion.khu.website.analytics;

import likelion.khu.website.analytics.dto.RecruitmentAnalyticsResponse;
import likelion.khu.website.application.ApplicationRepository;
import likelion.khu.website.recruitment.RecruitmentRound;
import likelion.khu.website.recruitment.RecruitmentRoundRepository;
import likelion.khu.website.recruitment.RecruitmentStatus;
import likelion.khu.website.recruitment.RecruitmentStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RecruitmentAnalyticsService {

    private final RecruitmentStatusRepository statusRepository;
    private final RecruitmentRoundRepository roundRepository;
    private final ApplicationRepository applicationRepository;

    @Transactional(readOnly = true)
    public RecruitmentAnalyticsResponse summarize() {
        RecruitmentStatus status = statusRepository.findById(RecruitmentStatus.SINGLETON_ID).orElse(null);
        RecruitmentRound round = status != null && status.getCurrentRoundId() != null
                ? roundRepository.findById(status.getCurrentRoundId()).orElse(null)
                : roundRepository.findTopByOrderByOpenedAtDesc().orElse(null);
        if (round == null) {
            return RecruitmentAnalyticsResponse.empty();
        }

        boolean open = status != null && status.isOpen()
                && round.getId().equals(status.getCurrentRoundId());
        return new RecruitmentAnalyticsResponse(
                round.getId(),
                open ? "OPEN" : "CLOSED",
                round.getOpenedAt(),
                round.getClosedAt(),
                applicationRepository.countByRecruitmentRoundId(round.getId())
        );
    }
}
