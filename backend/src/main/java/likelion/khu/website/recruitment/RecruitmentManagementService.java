package likelion.khu.website.recruitment;

import likelion.khu.website.email.EmailService;
import likelion.khu.website.email.exception.EmailSendException;
import likelion.khu.website.notification.NotificationSubscriptionRepository;
import likelion.khu.website.recruitment.dto.RecruitmentStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RecruitmentManagementService {

    private final RecruitmentStatusRepository statusRepository;
    private final NotificationSubscriptionRepository subscriptionRepository;
    private final EmailService emailService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    public RecruitmentStatusResponse getStatus() {
        return toResponse(findOrCreate());
    }

    // 의도적으로 클래스/메서드 레벨 @Transactional을 안 쓴다 — 상태 플립(statusRepository.save)
    // 자체는 Spring Data 리포지토리 메서드가 짧은 트랜잭션을 하나 열고 닫으므로 이걸로 충분하고,
    // 발송은 아래 이벤트를 거쳐 요청 스레드 밖(별도 스레드)에서 돈다(왜 발송을 트랜잭션에 안
    // 묶는지는 원래 이유가 여전히 유효 — 구독자가 많으면 오래 걸리는데 SQLite 커넥션 풀이
    // 1개뿐이라 email-module.md 참고).
    //
    // 트랜잭션을 안 여는 게 EmailService 쪽에도 영향을 준다 — EmailService.recordSuccess()/
    // recordFailureSafely()는 TransactionSynchronizationManager.isActualTransactionActive()로
    // "지금 활성 트랜잭션 안인가"를 확인해서, 안이면 email_log를 이벤트로 발행해 트랜잭션 종료
    // 후 별도 스레드에서 저장하고(AdminInvitationService 같은 @Transactional 호출부용 — SQLite
    // 단일 커넥션 데드락 회피, email-module.md 트랜잭션 경계 절 참고), 밖이면 그 자리에서 바로
    // 저장한다. sendToAllSubscribers()는 RecruitmentOpenEmailEventListener의 @Async 스레드에서
    // 실행되므로 거기도 활성 트랜잭션이 없어 매번 후자(즉시 동기 저장) 경로를 탄다 — 기존과 동일.
    public RecruitmentStatusResponse open() {
        RecruitmentStatus status = findOrCreate();
        // "닫힘→열림 전이일 때만" — 이미 열려있으면(open()을 두 번 눌러도) 이 if를 안 타서
        // 이벤트 자체가 발행되지 않는다. 완료기준의 "중복 발송 방지"는 이 한 줄이 전부다.
        if (!status.isOpen()) {
            status.markOpened();
            statusRepository.save(status);
            // 발송은 여기서 동기로 하지 않는다(#126 리뷰, @ParkIlha) — 구독자가 수십~수백이면
            // 컨트롤러 스레드가 발송 루프가 끝날 때까지 응답을 못 줘서, OCI SMTP 건당 왕복
            // (타임아웃 5s)이 누적돼 요청이 게이트웨이/LB 타임아웃에 걸릴 수 있다. 위 save()가
            // 이미 커밋된 뒤라 멱등 가드(isOpen()==true)는 이 시점부터 바로 유효하므로, 이벤트만
            // 발행하고 실제 발송은 RecruitmentOpenEmailEventListener(@Async)가 이어받아도 안전하다.
            eventPublisher.publishEvent(new RecruitmentOpenedEvent());
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
    // package-private: RecruitmentOpenEmailEventListener(@Async)가 별도 스레드에서 호출한다.
    void sendToAllSubscribers() {
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
