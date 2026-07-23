package likelion.khu.website.recruitment;

import likelion.khu.website.email.EmailService;
import likelion.khu.website.email.exception.EmailSendException;
import likelion.khu.website.notification.NotificationSubscriptionRepository;
import likelion.khu.website.recruitment.dto.RecruitmentPublicStatusResponse;
import likelion.khu.website.recruitment.dto.RecruitmentStatusResponse;
import likelion.khu.website.recruitment.exception.RecruitmentProductionHoldException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecruitmentManagementService {

    private final RecruitmentStatusRepository statusRepository;
    private final NotificationSubscriptionRepository subscriptionRepository;
    private final EmailService emailService;
    private final ApplicationEventPublisher eventPublisher;

    // app.frontend-base-url(admin.likelion-khu.com)이 아니라 이걸 쓴다 — frontend-base-url은
    // 어드민 초대·비밀번호 재설정 전용이고(#124 리뷰에서 혼용 발견), 이 메일은 일반 구독자에게
    // 가므로 공개 사이트 주소가 맞다.
    @Value("${app.public-site-url}")
    private String publicSiteUrl;

    // 지원폼(#152)이 완성되기 전까지 모집 열기를 막는 스위치(이슈 #154 PM 결정: B — prod에서는
    // 지원폼 없이 모집을 열지 않는다, 스테이지에서만 검증). 기본값 false라 운영(.env.prod)은
    // 이 값을 명시적으로 켜기 전까지 항상 막혀 있고, 검증 환경(스테이지 .env.stage·테스트)만
    // true로 열어 관리자 화면·안내 메일 발송을 미리 확인한다. #152가 끝나면 .env.prod에서
    // 이 값을 true로 바꾸는 것으로 운영 오픈을 허용한다 — 코드 변경이 필요 없다.
    @Value("${app.recruitment.application-form-ready:false}")
    private boolean applicationFormReady;

    public RecruitmentStatusResponse getStatus() {
        return toResponse(findOrCreate());
    }

    // 공개 방문자용 — 랜딩·/recruit 페이지가 평소/모집중 화면을 가르는 데만 쓴다(#151).
    // subscriberCount는 관리자 전용 정보라 여기 담지 않는다.
    public RecruitmentPublicStatusResponse getPublicStatus() {
        return new RecruitmentPublicStatusResponse(findOrCreate().isOpen());
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
    //
    // synchronized: 아래 "읽고(findOrCreate) → 확인(isOpen) → 쓰기(save)"가 한 덩어리로 원자적이어야
    // 멱등 가드가 의미가 있다. 그렇지 않으면 두 요청이 거의 동시에 들어왔을 때 둘 다 markOpened() 이전
    // isOpen()==false를 읽어버려 이벤트가 두 번 발행되고 구독자 전원이 안내 메일을 중복으로 받는다
    // (#124 리뷰에서 발견). 이 앱은 SQLite 단일 파일·HikariCP 풀 크기 1(application.yml)로 애초에
    // 단일 인스턴스 배포를 전제하므로, synchronized(= 이 빈 인스턴스 기준 락)만으로 충분하다 —
    // 여러 인스턴스로 수평 확장하게 되면 DB 레벨 락(@Version 등)으로 다시 가야 한다.
    public synchronized RecruitmentStatusResponse open() {
        if (!applicationFormReady) {
            throw new RecruitmentProductionHoldException();
        }
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

    // open()과 같은 락(this)을 공유하도록 synchronized — 아니면 open()이 read-check-write를
    // 도는 도중에 close()가 아무 대기 없이 끼어들어 같은 싱글턴 행에 동시에 쓸 수 있다. 발송
    // 중복까지는 안 이어지지만(close()는 이벤트를 안 띄움), "열기/닫기 중 하나가 완전히 끝난
    // 뒤에만 다음 상태 전이가 일어난다"는 걸 보장하려면 같은 모니터를 써야 한다.
    public synchronized RecruitmentStatusResponse close() {
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
    //
    // 바깥 try/catch(Exception): 안쪽 catch는 "구독자 한 명"의 EmailSendException만 잡는다.
    // findAll() 자체가 던지는 예외(DB 순간 장애 등)나 그 밖의 예상 못 한 예외는 안쪽 catch
    // 밖이라, 여기서도 안 잡으면 @Async 스레드에서 그대로 터져 Spring 기본 핸들러가 서버 로그
    // 한 줄만 남기고 끝난다 — email_log엔 아무 흔적도 안 남아 #113 실패 임계치 알림도 못 보고,
    // "구독자 0명에게 발송됐다"는 사실을 아무도 알아채지 못한다. 그래서 배치 전체를 감싸
    // 명시적으로 ERROR 로그를 남긴다 — 새 인프라(email_log 스키마 변경 등)를 만들지 않고,
    // 지금 있는 서버 로그 관측 경로에 "이건 놓치면 안 되는 에러"라는 신호만 확실히 남기는 선.
    void sendToAllSubscribers() {
        try {
            subscriptionRepository.findAll().forEach(subscription -> {
                try {
                    emailService.sendRecruitmentOpenEmail(subscription.getEmail(), publicSiteUrl);
                } catch (EmailSendException e) {
                    // 계속 진행 — 실패는 email_log로 추적(#113 실패 임계치 알림의 대상).
                }
            });
        } catch (Exception e) {
            log.error("모집 안내메일 배치 발송이 구독자 개별 재시도 범위 밖에서 중단됐습니다 — " +
                    "구독자 목록 조회 실패 등으로 일부 또는 전원이 발송을 못 받았을 수 있습니다.", e);
        }
    }

    private RecruitmentStatus findOrCreate() {
        return statusRepository.findById(RecruitmentStatus.SINGLETON_ID)
                .orElseGet(() -> statusRepository.save(new RecruitmentStatus()));
    }

    private RecruitmentStatusResponse toResponse(RecruitmentStatus status) {
        return new RecruitmentStatusResponse(status.isOpen(), subscriptionRepository.count());
    }
}
