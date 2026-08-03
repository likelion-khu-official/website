package likelion.khu.website.recruitment;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 모집기와 싱글턴 상태는 항상 함께 바뀌어야 한다. 메일 발송을 포함하는 바깥 서비스에는
// 긴 트랜잭션을 두지 않고, DB의 두 행을 바꾸는 짧은 구간만 이 별도 빈에서 원자적으로 묶는다.
@Service
@RequiredArgsConstructor
public class RecruitmentRoundLifecycle {

    private final RecruitmentStatusRepository statusRepository;
    private final RecruitmentRoundRepository roundRepository;

    @Transactional
    public RecruitmentStatus open(RecruitmentStatus status) {
        RecruitmentRound round = roundRepository.save(RecruitmentRound.openNow());
        status.markOpened(round.getId(), round.getOpenedAt());
        return statusRepository.save(status);
    }

    @Transactional
    public RecruitmentStatus close(RecruitmentStatus status) {
        if (status.isOpen() && status.getCurrentRoundId() != null) {
            roundRepository.findById(status.getCurrentRoundId()).ifPresent(RecruitmentRound::closeNow);
        }
        status.markClosed();
        return statusRepository.save(status);
    }
}
