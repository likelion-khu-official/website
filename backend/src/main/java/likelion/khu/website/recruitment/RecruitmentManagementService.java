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
    // 이걸로 충분하다.
    //
    // 트랜잭션을 안 여는 게 EmailService 쪽에도 영향을 준다 — EmailService.recordSuccess()/
    // recordFailureSafely()는 TransactionSynchronizationManager.isActualTransactionActive()로
    // "지금 활성 트랜잭션 안인가"를 확인해서, 안이면 email_log를 이벤트로 발행해 트랜잭션 종료
    // 후 별도 스레드에서 저장하고(AdminInvitationService 같은 @Transactional 호출부용 — SQLite
    // 단일 커넥션 데드락 회피, email-module.md 트랜잭션 경계 절 참고), 밖이면 그 자리에서 바로
    // 저장한다. 여기서 트랜잭션을 열지 않으므로 매번 후자(즉시 동기 저장 — 가장 단순하고
    // 가장 많이 검증된 경로)를 타게 된다.
    public RecruitmentStatusResponse open() {
        RecruitmentStatus status = findOrCreate();
        // "닫힘→열림 전이일 때만" — 이미 열려있으면(open()을 두 번 눌러도) 이 if를 안 타서
        // sendToAllSubscribers() 자체가 안 불린다. 완료기준의 "중복 발송 방지"는 이 한 줄이 전부다.
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

    // 한 명 발송 실패가 나머지 구독자 발송을 막으면 안 된다. EmailService.send()는 실패
    // 순간 email_log에 FAILURE를 먼저 저장한 뒤에야 EmailSendException을 던지므로(EmailService
    // 참고), 여기 도달했을 땐 이미 로그가 남아있는 상태 — catch에서 할 일은 "이 사람은 실패했으니
    // 다음 구독자로 넘어가자"뿐이다. catch가 없으면 한 명 실패에 forEach 전체가 멈춘다.
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
