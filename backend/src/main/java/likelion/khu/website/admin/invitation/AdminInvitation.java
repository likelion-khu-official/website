package likelion.khu.website.admin.invitation;

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

import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Table(name = "admin_invitations")
@Getter
@NoArgsConstructor
public class AdminInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private String email;

    // 초대한 SUPER_ADMIN의 이메일 스냅샷 — FK 아님. 이 코드베이스엔 @ManyToOne 전례가 없고,
    // 감사 기록 관점에서도 나중에 초대자 계정이 바뀌거나 삭제돼도 기록이 변하면 안 되므로 스냅샷이 더 정확.
    @Column(nullable = false)
    private String invitedByEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvitationStatus status;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static AdminInvitation issue(String email, String invitedByEmail, String token, Duration ttl) {
        AdminInvitation invitation = new AdminInvitation();
        invitation.email = email;
        invitation.invitedByEmail = invitedByEmail;
        invitation.token = token;
        invitation.status = InvitationStatus.PENDING;
        invitation.expiresAt = LocalDateTime.now().plus(ttl);
        invitation.createdAt = LocalDateTime.now();
        return invitation;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public void markAccepted() {
        if (status != InvitationStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 초대예요.");
        }
        status = InvitationStatus.ACCEPTED;
    }

    public void markCancelled() {
        if (status != InvitationStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 초대예요.");
        }
        status = InvitationStatus.CANCELLED;
    }
}
