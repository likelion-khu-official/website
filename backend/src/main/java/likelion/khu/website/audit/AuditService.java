package likelion.khu.website.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

// 감사 기록을 남기고(record) 다시 꺼내 보는(search) 단일 진입점.
//
// 트랜잭션 정책: 기록은 기본 전파(REQUIRED)를 쓴다.
//  - 서버 경계 필터에서 부를 때는 이미 컨트롤러 트랜잭션이 끝난 뒤라 여기서 새 트랜잭션이 열려 독립 커밋된다.
//  - 로그인 실패를 남길 때는 AuthService.login의 트랜잭션에 참여하지만, 그 메서드가
//    noRollbackFor로 실패 예외에서 롤백하지 않게 해 두어 실패 기록이 지워지지 않는다.
// (SQLite는 동시성이 약해 REQUIRES_NEW 중첩 트랜잭션이 잠금을 유발할 수 있어 일부러 피했다.)
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditEventRepository repository;

    @Transactional
    public void record(ActorType actorType, Long actorId, String actorLabel, AuditAction action,
                       String httpMethod, String path, AuditOutcome outcome, Integer statusCode, String clientIp) {
        repository.save(AuditEvent.of(actorType, actorId, actorLabel, action,
                httpMethod, path, outcome, statusCode, clientIp));
    }

    @Transactional(readOnly = true)
    public Page<AuditEvent> search(ActorType actorType, AuditAction action,
                                   LocalDateTime from, LocalDateTime to, String q, Pageable pageable) {
        return repository.search(actorType, action, from, to, q, pageable);
    }
}
