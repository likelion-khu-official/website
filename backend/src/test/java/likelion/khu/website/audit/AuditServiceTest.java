package likelion.khu.website.audit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class AuditServiceTest {

    @Autowired AuditService auditService;
    @Autowired AuditEventRepository repository;

    @BeforeEach
    void setUp() {
        repository.save(AuditEvent.of(
                ActorType.ADMIN, 1L, "admin@likelion.org", AuditAction.STATE_CHANGE,
                "멤버 오프보딩", "활성 상태: true -> false", "MEMBER", 12L,
                null, null, AuditOutcome.SUCCESS, null, "127.0.0.1"));
        repository.save(AuditEvent.of(
                ActorType.ANONYMOUS, null, "20260001", AuditAction.LOGIN_FAILURE,
                null, null, null, null,
                "POST", "/api/member/auth/login", AuditOutcome.FAILURE, 401, "127.0.0.2"));
        repository.save(AuditEvent.of(
                ActorType.ADMIN, 1L, "admin@likelion.org", AuditAction.SENSITIVE_READ,
                null, null, null, null,
                "GET", "/api/admin/audit-logs", AuditOutcome.SUCCESS, 200, "127.0.0.1"));
    }

    @Test
    void searchCombinesEventTargetOutcomeAndSummaryFilters() {
        Page<AuditEvent> result = auditService.search(
                ActorType.ADMIN, AuditAction.STATE_CHANGE, AuditEventType.PEOPLE_MANAGEMENT,
                "member", 12L, AuditOutcome.SUCCESS, AuditView.ALL,
                null, null, "오프보딩", PageRequest.of(0, 50));

        assertThat(result.getContent())
                .singleElement()
                .extracting(AuditEvent::getTargetId)
                .isEqualTo(12L);
    }

    @Test
    void importantViewOnlyExcludesRoutineAuditReviewEvents() {
        Page<AuditEvent> important = auditService.search(
                null, null, null, null, null, null, AuditView.IMPORTANT,
                null, null, null, PageRequest.of(0, 50));
        Page<AuditEvent> all = auditService.search(
                null, null, null, null, null, null, AuditView.ALL,
                null, null, null, PageRequest.of(0, 50));

        assertThat(important.getContent())
                .extracting(AuditEvent::getEventType)
                .doesNotContain(AuditEventType.AUDIT_REVIEW)
                .contains(AuditEventType.PEOPLE_MANAGEMENT, AuditEventType.AUTHENTICATION);
        assertThat(all.getContent())
                .extracting(AuditEvent::getEventType)
                .contains(AuditEventType.AUDIT_REVIEW);
    }
}
