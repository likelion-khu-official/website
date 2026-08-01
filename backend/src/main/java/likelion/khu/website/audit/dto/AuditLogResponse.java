package likelion.khu.website.audit.dto;

import likelion.khu.website.audit.AuditEvent;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

// 감사 로그 조회 응답 — 한 페이지의 항목들 + 페이지 메타. shared/types/audit.ts의 AuditLogResponse와 형태를 맞춘다.
@Getter
@AllArgsConstructor
public class AuditLogResponse {

    private final List<Entry> entries;
    private final int page;
    private final int totalPages;
    private final long totalCount;

    public static AuditLogResponse from(Page<AuditEvent> pageResult) {
        List<Entry> entries = pageResult.getContent().stream().map(Entry::from).toList();
        return new AuditLogResponse(entries, pageResult.getNumber(), pageResult.getTotalPages(), pageResult.getTotalElements());
    }

    @Getter
    @AllArgsConstructor
    public static class Entry {
        private final Long id;
        private final String actorType;
        private final Long actorId;
        private final String actorLabel;
        private final String action;
        private final String eventType;
        private final String summary;
        private final String detail;
        private final String targetType;
        private final Long targetId;
        private final String httpMethod;
        private final String path;
        private final String outcome;
        private final Integer statusCode;
        private final String clientIp;
        private final LocalDateTime occurredAt;

        static Entry from(AuditEvent event) {
            return new Entry(
                    event.getId(),
                    event.getActorType().name(),
                    event.getActorId(),
                    event.getActorLabel(),
                    event.getAction().name(),
                    event.getEventType().name(),
                    event.getSummary(),
                    event.getDetail(),
                    event.getTargetType(),
                    event.getTargetId(),
                    event.getHttpMethod(),
                    event.getPath(),
                    event.getOutcome().name(),
                    event.getStatusCode(),
                    event.getClientIp(),
                    event.getOccurredAt());
        }
    }
}
