package likelion.khu.website.audit;

import jakarta.servlet.http.HttpServletRequest;
import likelion.khu.website.admin.auth.AdminPrincipal;
import likelion.khu.website.admin.auth.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

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
                null, null, null, null, httpMethod, path, outcome, statusCode, clientIp));
    }

    // 명시 계측 — 상태변경을 사람이 읽는 요약과 함께 남긴다. 현재 로그인 주체·요청 IP는 SecurityContext와
    // 요청 컨텍스트에서 자동으로 채우므로, 각 서비스는 "무엇을 했는지"(요약·상세)만 넘기면 된다.
    @Transactional
    public void recordStateChange(String summary, String targetType, Long targetId, AuditOutcome outcome) {
        recordStateChange(summary, null, targetType, targetId, outcome);
    }

    // detail = 변경 전→후 같은 상세(커밋 로그 본문 격). 없으면 null.
    @Transactional
    public void recordStateChange(String summary, String detail, String targetType, Long targetId, AuditOutcome outcome) {
        Actor actor = currentActor();
        repository.save(AuditEvent.of(actor.type(), actor.id(), actor.label(), AuditAction.STATE_CHANGE,
                summary, detail, targetType, targetId, null, null, outcome, null, currentIp()));
    }

    private record Actor(ActorType type, Long id, String label) {}

    private Actor currentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AdminPrincipal principal) {
            ActorType type = JwtProvider.MEMBER_ROLE.equals(principal.getRole()) ? ActorType.MEMBER : ActorType.ADMIN;
            return new Actor(type, principal.getId(), principal.getEmail());
        }
        return new Actor(ActorType.ANONYMOUS, null, null);
    }

    private String currentIp() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            HttpServletRequest request = servletAttrs.getRequest();
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }
        return null;
    }

    @Transactional(readOnly = true)
    public Page<AuditEvent> search(ActorType actorType, AuditAction action, AuditEventType eventType,
                                   String targetType, Long targetId, AuditOutcome outcome, AuditView view,
                                   LocalDateTime from, LocalDateTime to, String q, Pageable pageable) {
        AuditEventType excludedEventType = view == AuditView.IMPORTANT ? AuditEventType.AUDIT_REVIEW : null;
        return repository.search(actorType, action, eventType, targetType, targetId, outcome, excludedEventType,
                from, to, q, pageable);
    }
}
