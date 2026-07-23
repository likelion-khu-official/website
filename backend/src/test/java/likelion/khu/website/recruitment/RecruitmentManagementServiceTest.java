package likelion.khu.website.recruitment;

import likelion.khu.website.email.EmailService;
import likelion.khu.website.notification.NotificationSubscriptionRepository;
import likelion.khu.website.recruitment.exception.RecruitmentProductionHoldException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// 스프링 컨테이너 없는 순수 단위 테스트(EmailServiceTest와 동일한 스타일) —
// sendToAllSubscribers()의 "구독자별 실패"가 아니라 "배치 전체 실패" 방어선만 확인한다.
class RecruitmentManagementServiceTest {

    @Mock
    private RecruitmentStatusRepository statusRepository;

    @Mock
    private NotificationSubscriptionRepository subscriptionRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private RecruitmentManagementService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new RecruitmentManagementService(statusRepository, subscriptionRepository, emailService, eventPublisher);
        ReflectionTestUtils.setField(service, "publicSiteUrl", "https://likelion-khu.com");
    }

    // 구독자 한 명의 EmailSendException은 안쪽 catch가 잡지만, findAll() 자체가 던지는 예외
    // (DB 순간 장애 등)는 그 밖이다. 예전엔 이게 @Async 스레드로 그대로 터져 Spring 기본
    // 핸들러가 로그 한 줄만 남기고 끝났다 — 여기선 바깥 try/catch가 삼켜서 예외가 호출자까지
    // 전파되지 않는지(= @Async 스레드가 죽지 않는지) 확인한다.
    @Test
    void sendToAllSubscribers_SubscriberListLookupFails_DoesNotPropagate() {
        when(subscriptionRepository.findAll()).thenThrow(new RuntimeException("DB down"));

        assertThatCode(service::sendToAllSubscribers).doesNotThrowAnyException();

        verifyNoInteractions(emailService);
    }

    // #154 결정(B) — 지원폼(#152)이 준비되지 않은 환경(기본값)에서는 open()이 상태를 바꾸거나
    // 메일 이벤트를 발행하기 전에 막혀야 한다. applicationFormReady는 기본값(false)을 그대로 둬서
    // "아직 세팅 안 한 환경 = 막힘"이 기본 동작임도 함께 확인한다.
    @Test
    void open_ApplicationFormNotReady_ThrowsAndDoesNotChangeState() {
        assertThatThrownBy(service::open).isInstanceOf(RecruitmentProductionHoldException.class);

        verifyNoInteractions(statusRepository, eventPublisher);
    }
}
