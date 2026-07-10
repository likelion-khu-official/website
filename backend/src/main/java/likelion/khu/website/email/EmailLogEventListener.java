package likelion.khu.website.email;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// EmailService.send()가 활성 트랜잭션 안에서 호출되면(예: 미래의 #74가 토큰 저장과 한 트랜잭션으로
// 묶는 경우) email_log 저장을 이 이벤트 경유로 넘긴다 — 왜 직접 저장하면 안 되는지:
//
// SQLite는 HikariCP 커넥션 풀이 1개로 고정돼 있다(application.yml, single-writer 전제). 바깥
// 트랜잭션이 그 1개를 붙잡고 있는 동안, 같은 스레드에서 새 트랜잭션(REQUIRES_NEW 등)을 열려 하면
// 풀에 커넥션이 없어 대기하는데, 그 커넥션은 바깥 트랜잭션이 끝나야(rollback/commit 완료 후
// cleanupAfterCompletion에서) 반납된다 — 근데 바깥 트랜잭션은 지금 우리(같은 스레드)가 끝내주길
// 기다리는 중이라 서로 기다리다 데드락(실측: #85, REQUIRES_NEW로 시도했다가 CI에서 확인).
//
// @Async로 별도 스레드에서 실행하면 이 순환 대기가 끊긴다 — 원래 스레드는 우리를 기다리지 않고
// 바로 트랜잭션 정리(커넥션 반납)를 마치고, 우리는 별도 스레드에서 그 반납된 커넥션을 받아 저장한다.
// AFTER_COMPLETION이라 바깥 트랜잭션이 커밋되든 롤백되든 상관없이 항상 실행됨 — "발송 결과는
// 무조건 email_log에 남아야 한다"는 불변식을 트랜잭션 결과와 무관하게 지킴.
@Component
@RequiredArgsConstructor
class EmailLogEventListener {

    private final EmailLogRepository emailLogRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION, fallbackExecution = true)
    void onEmailLogEvent(EmailLogEvent event) {
        emailLogRepository.save(event.toEmailLog());
    }
}
