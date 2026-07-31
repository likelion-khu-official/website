package likelion.khu.website.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// 시스템에서 일어난 한 건의 감사 이벤트 — 한 번 쓰면 고치거나 지울 수 없는(append-only) 기록.
// 이 불변성은 세 겹으로 지킨다: (1) 이 엔티티에 상태를 바꾸는 setter나 메서드가 없고,
// (2) AuditEventRepository가 save·조회만 노출하고 삭제·수정 연산을 아예 안 갖고,
// (3) 조회 API(AuditController)에 쓰기 경로가 없다. "앱을 통해서는 관리자조차 못 고친다"(#338).
@Entity
@Table(name = "audit_events")
@Getter
@NoArgsConstructor
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ActorType actorType;

    // 익명 방문자나 계정을 못 찾은 실패 로그인은 id가 없을 수 있다.
    @Column
    private Long actorId;

    // 행위 시점의 로그인 식별자 스냅샷 — 어드민 이메일 또는 멤버 학번. 나중에 계정이 바뀌어도 그때 누구였는지 남긴다.
    // 개인정보 '내용'은 담지 않는다(로그인 식별자까지만) — 로그가 개인정보 사본이 되면 안 된다(SECURITY.md).
    @Column(length = 255)
    private String actorLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AuditAction action;

    // 상태변경·열람은 HTTP 메서드+경로로 무엇을 했는지 남긴다(예: DELETE /api/admin/members/5).
    // 인증 이벤트는 메서드·경로가 비어 있을 수 있다.
    @Column(length = 10)
    private String httpMethod;

    @Column(length = 500)
    private String path;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private AuditOutcome outcome;

    @Column
    private Integer statusCode;

    @Column(length = 45)
    private String clientIp;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    // 생성만 가능하고 이후 상태를 바꾸는 경로가 없다 — 불변. 정적 팩토리로 생성 의도를 좁힌다.
    private AuditEvent(ActorType actorType, Long actorId, String actorLabel, AuditAction action,
                       String httpMethod, String path, AuditOutcome outcome, Integer statusCode, String clientIp) {
        this.actorType = actorType;
        this.actorId = actorId;
        this.actorLabel = actorLabel;
        this.action = action;
        this.httpMethod = httpMethod;
        this.path = path;
        this.outcome = outcome;
        this.statusCode = statusCode;
        this.clientIp = clientIp;
        this.occurredAt = LocalDateTime.now();
    }

    public static AuditEvent of(ActorType actorType, Long actorId, String actorLabel, AuditAction action,
                                String httpMethod, String path, AuditOutcome outcome,
                                Integer statusCode, String clientIp) {
        return new AuditEvent(actorType, actorId, actorLabel, action, httpMethod, path, outcome, statusCode, clientIp);
    }
}
