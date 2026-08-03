package likelion.khu.website.feed.comment;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class CommentTrackingRetentionJob {

    private static final int RETENTION_DAYS = 90;
    private final CommentRepository commentRepository;

    @Scheduled(cron = "0 20 4 * * *", zone = "Asia/Seoul")
    @Transactional
    public void clearExpiredTrackingSignals() {
        commentRepository.clearTrackingSignalsCreatedBefore(
                LocalDateTime.now().minusDays(RETENTION_DAYS));
    }
}
