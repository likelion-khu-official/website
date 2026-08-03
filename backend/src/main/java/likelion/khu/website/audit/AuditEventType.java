package likelion.khu.website.audit;

import java.util.Set;

/**
 * 감사 이벤트가 속한 업무 영역. action이 무엇을 했는지를 나타낸다면, eventType은 어느 영역의
 * 사건인지를 나타낸다. 둘을 분리해야 로그인 실패나 콘텐츠 변경처럼 운영자가 찾는 사건을 안정적으로
 * 좁힐 수 있고, 사람이 쓰는 summary 문구를 검색 조건으로 오용하지 않게 된다.
 */
public enum AuditEventType {
    AUTHENTICATION,
    PEOPLE_MANAGEMENT,
    CONTENT_MANAGEMENT,
    RECRUITMENT_MANAGEMENT,
    APPLICATION_MANAGEMENT,
    SENSITIVE_ACCESS,
    AUDIT_REVIEW,
    OTHER;

    private static final Set<String> PEOPLE_TARGETS = Set.of("ADMIN", "ADMIN_INVITATION", "MEMBER", "STAFF");
    private static final Set<String> CONTENT_TARGETS = Set.of("POST", "COMMENT", "PROJECT");

    public static AuditEventType classify(AuditAction action, String targetType, String path) {
        if (action == AuditAction.LOGIN_SUCCESS || action == AuditAction.LOGIN_FAILURE || action == AuditAction.LOGOUT) {
            return AUTHENTICATION;
        }
        if (action == AuditAction.SENSITIVE_READ) {
            return "/api/admin/audit-logs".equals(path) ? AUDIT_REVIEW : SENSITIVE_ACCESS;
        }
        if (targetType == null) {
            return OTHER;
        }
        if (PEOPLE_TARGETS.contains(targetType)) {
            return PEOPLE_MANAGEMENT;
        }
        if (CONTENT_TARGETS.contains(targetType)) {
            return CONTENT_MANAGEMENT;
        }
        if ("RECRUITMENT".equals(targetType)) {
            return RECRUITMENT_MANAGEMENT;
        }
        if ("APPLICATION_FORM".equals(targetType)) {
            return APPLICATION_MANAGEMENT;
        }
        return OTHER;
    }
}
