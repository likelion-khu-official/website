package likelion.khu.website.audit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuditEventTypeTest {

    @Test
    void classifySeparatesAuditReviewFromOtherSensitiveReads() {
        assertThat(AuditEventType.classify(
                AuditAction.SENSITIVE_READ, null, "/api/admin/audit-logs"))
                .isEqualTo(AuditEventType.AUDIT_REVIEW);
        assertThat(AuditEventType.classify(
                AuditAction.SENSITIVE_READ, null, "/api/admin/applications"))
                .isEqualTo(AuditEventType.SENSITIVE_ACCESS);
    }

    @Test
    void classifyUsesStableTargetDomainInsteadOfSummaryText() {
        assertThat(AuditEventType.classify(AuditAction.STATE_CHANGE, "MEMBER", null))
                .isEqualTo(AuditEventType.PEOPLE_MANAGEMENT);
        assertThat(AuditEventType.classify(AuditAction.STATE_CHANGE, "POST", null))
                .isEqualTo(AuditEventType.CONTENT_MANAGEMENT);
    }
}
