package likelion.khu.website.email;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// 여기 왜 @Async + @TransactionalEventListener 조합이 필요한지 — 처음엔 REQUIRES_NEW로
// email_log 저장을 분리하려 했는데 CI에서 커넥션 타임아웃으로 터졌다(#85). SQLite는
// HikariCP 풀이 1개(application.yml, single-writer 전제)라, "바깥 트랜잭션이 이미 그 1개를
// 쥔 채로 같은 스레드에서 REQUIRES_NEW가 새 커넥션을 요청"하면 서로가 서로를 기다리는
// 순환 대기가 생긴다 — 세차장에 비유하면, 차 A(바깥 트랜잭션)가 "뒤차 B(이 저장)가 먼저
// 세차를 마치는 걸 봐야 내가 나가겠다"는 상황인데, B는 A가 안 나가면 애초에 들어갈 자리가
// 없다. 영원히 안 풀림.
//
// @TransactionalEventListener만 얹어도 이 순환은 그대로 재현된다 — phase만 다를 뿐 콜백은
// 여전히 "그 트랜잭션을 실행하던 바로 그 스레드"에서 동기(synchronous) 호출되고, 그 스레드가
// 커넥션을 실제로 반납하는 시점(cleanupAfterCompletion)은 이 콜백이 다 끝난 *다음*이라
// REQUIRES_NEW와 사정이 똑같다.
//
// @Async가 이 순환을 끊는다: 콜백을 별도 스레드로 넘기고 원래 스레드는 그 콜백이 끝나길
// "기다리지 않고" 바로 다음(커넥션 반납)으로 넘어간다. 세차장으로 치면 A는 이제 B를 신경
// 안 쓰고 자기 볼일 끝나면 바로 나간다. 이 새 스레드(B 역할)가 A보다 살짝 먼저 도착해서
// 커넥션을 달라고 해도, 그건 그냥 A가 나갈 때까지 잠깐 줄 서는 것뿐이지 — A가 B를 기다리는
// 게 아니니까 — 데드락이 아니라 순간적인 대기로 끝난다. (실측 확인: Testcontainers + 진짜
// @Transactional 프록시로 여러 번 돌려서 매번 통과.)
//
// AFTER_COMPLETION: 커밋되든 롤백되든 상관없이 트랜잭션이 "끝난 직후"에 무조건 실행하라는
// 뜻(기본값 AFTER_COMMIT은 롤백되면 아예 안 실행됨 — 우리는 실패해도 로그가 남아야 하니
// 이걸 명시적으로 씀). "끝난 직후"라고 해도 원래 이벤트 발행 시점으로부터 밀리초 단위 — 이벤트가
// 어디 큐나 DB에 저장돼서 기다리는 게 아니라, 그냥 그 트랜잭션에 붙어있는 인메모리 콜백 목록에
// 이벤트 객체(EmailLogEvent) 참조가 잠깐 물려있다가, 트랜잭션이 끝나는 순간 그 콜백이 실행되는
// 것뿐이다. 그래서 이 방식은 크래시에 안전하지 않다 — 이 짧은 구간에 서버가 죽으면 그 로그는
// 그냥 유실된다. 큐/아웃박스 테이블 같은 영속 저장소가 아니라 순수 인메모리 메커니즘이라는 걸
// 알고 써야 함(이 프로젝트 트래픽 규모에선 감수 가능한 트레이드오프로 판단).
@Component
@RequiredArgsConstructor
class EmailLogEventListener {

    private final EmailLogRepository emailLogRepository;

    // 이 저장 자체가 실패해도(예: DB 커넥션 문제) 예외를 삼킨다 — @Async void 메서드라 어차피
    // 아무도 이 예외를 기다리고 있지 않고(원래 발송 결과는 이미 호출자에게 동기적으로 전파된
    // 뒤라, 여기서 던져봐야 누구에게도 안 들리는 예외가 될 뿐), Spring 기본 비동기 예외 핸들러가
    // 콘솔에 찍는 것 말고는 의미가 없다. 그래서 명시적으로 잡아서 "이 로그 한 줄을 못 남겼다"는
    // 사실만 조용히 받아들인다 — 원래 send()의 logFailureSafely()와 같은 태도.
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION, fallbackExecution = true)
    void onEmailLogEvent(EmailLogEvent event) {
        try {
            emailLogRepository.save(event.toEmailLog());
        } catch (Exception ignored) {
            // 의도적으로 무시 — 위 주석 참고
        }
    }
}
