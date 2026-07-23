package likelion.khu.website.recruitment;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// 왜 이벤트+@Async로 우회하냐면(#126 리뷰, @ParkIlha) — RecruitmentManagementService.open()이
// 컨트롤러 스레드에서 sendToAllSubscribers()를 동기로 끝까지 돌리면, 구독자가 수십~수백일 때
// OCI SMTP 건당 왕복(타임아웃 5s)이 누적돼 요청이 게이트웨이/LB 타임아웃에 걸릴 수 있다.
// @Async가 콜백을 별도 스레드로 넘겨 컨트롤러 스레드는 상태 플립(save) 커밋 직후 바로 응답한다
// (원리는 EmailLogEventListener 클래스 주석과 동일).
//
// AFTER_COMPLETION + fallbackExecution=true: open()이 statusRepository.save() 이후 트랜잭션 없이
// publishEvent를 부르므로(RecruitmentManagementService가 의도적으로 @Transactional을 안 씀),
// "활성 트랜잭션이 없을 때도 실행하라"는 fallbackExecution이 없으면 이 리스너가 아예 안 불린다.
@Component
@RequiredArgsConstructor
class RecruitmentOpenEmailEventListener {

    private final RecruitmentManagementService service;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION, fallbackExecution = true)
    void onRecruitmentOpened(RecruitmentOpenedEvent event) {
        service.sendToAllSubscribers();
    }
}
