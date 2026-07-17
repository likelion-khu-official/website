package likelion.khu.website.recruitment;

import likelion.khu.website.email.EmailService;
import likelion.khu.website.email.exception.EmailSendException;
import likelion.khu.website.notification.NotificationSubscriptionRepository;
import likelion.khu.website.recruitment.dto.RecruitmentStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RecruitmentManagementService {

    private final RecruitmentStatusRepository statusRepository;
    private final NotificationSubscriptionRepository subscriptionRepository;
    private final EmailService emailService;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    public RecruitmentStatusResponse getStatus() {
        return toResponse(findOrCreate());
    }

    // 의도적으로 클래스/메서드 레벨 @Transactional을 안 쓴다 — 구독자가 많으면 발송 루프가
    // 오래 걸리는데, SQLite 커넥션 풀이 1개뿐이라(email-module.md 참고) 트랜잭션을 오래 쥐고
    // 있으면 그동안 사이트 전체의 다른 DB 요청이 막힌다. 상태 플립(statusRepository.save)과
    // 발송 루프 각각은 Spring Data 리포지토리 메서드 자체가 짧은 트랜잭션을 하나씩 열고 닫으므로
    // 이걸로 충분하다 — 그리고 활성 트랜잭션이 없는 채로 EmailService를 부르니 매번 즉시
    // 동기 저장 경로(가장 단순하고 많이 검증된 경로)를 탄다.
    public RecruitmentStatusResponse open() {
        RecruitmentStatus status = findOrCreate();
        if (!status.isOpen()) {
            status.markOpened();
            statusRepository.save(status);
            sendToAllSubscribers();
        }
        return toResponse(status);
    }

    public RecruitmentStatusResponse close() {
        RecruitmentStatus status = findOrCreate();
        status.markClosed();
        statusRepository.save(status);
        return toResponse(status);
    }

    // 한 명 발송 실패가 나머지 구독자 발송을 막으면 안 된다 — email_log에는 EmailService
    // 내부에서 이미 FAILURE로 기록됐으니(활성 트랜잭션이 없어 즉시 저장) 여기선 다음 구독자로
    // 넘어가기만 하면 된다.
    private void sendToAllSubscribers() {
        subscriptionRepository.findAll().forEach(subscription -> {
            try {
                emailService.sendRecruitmentOpenEmail(subscription.getEmail(), frontendBaseUrl);
            } catch (EmailSendException e) {
                // 계속 진행 — 실패는 email_log로 추적(#113 실패 임계치 알림의 대상).
            }
        });
    }

    private RecruitmentStatus findOrCreate() {
        return statusRepository.findById(RecruitmentStatus.SINGLETON_ID)
                .orElseGet(() -> statusRepository.save(new RecruitmentStatus()));
    }

    private RecruitmentStatusResponse toResponse(RecruitmentStatus status) {
        return new RecruitmentStatusResponse(status.isOpen(), subscriptionRepository.count());
    }
}
