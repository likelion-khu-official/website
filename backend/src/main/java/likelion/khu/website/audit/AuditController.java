package likelion.khu.website.audit;

import likelion.khu.website.audit.dto.AuditLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

// 리뷰 표면(FE)이 읽어 가는 조회 전용 API — ADMIN 전원 공람. 쓰기 경로가 없다(append-only의 표면 쪽 보장).
// 이 엔드포인트를 열어 본 것 자체도 AuditFilter가 SENSITIVE_READ로 남긴다(#338).
@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private static final int MAX_SIZE = 100;

    private final AuditService auditService;

    @GetMapping
    public AuditLogResponse list(
            @RequestParam(required = false) ActorType actorType,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int cappedSize = Math.min(Math.max(size, 1), MAX_SIZE);
        String query = (q != null && q.isBlank()) ? null : q;
        Page<AuditEvent> result = auditService.search(
                actorType, action, from, to, query, PageRequest.of(Math.max(page, 0), cappedSize));
        return AuditLogResponse.from(result);
    }
}
