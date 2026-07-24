package likelion.khu.website.member.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// admin.auth.RefreshToken과 같은 shape이지만 별도 테이블 — 어드민 로그인 흐름(이미 운영 중)을
// 전혀 건드리지 않기 위해 일부러 합치지 않았다(#117 계획에서 확정).
@Entity
@Table(name = "member_refresh_tokens")
@Getter
@NoArgsConstructor
public class MemberRefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    @Column(nullable = false, columnDefinition = "bigint")
    private Long memberId;

    @Column(nullable = false, unique = true)
    private String tokenHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean revoked;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static MemberRefreshToken issue(Long memberId, String tokenHash, LocalDateTime expiresAt) {
        MemberRefreshToken token = new MemberRefreshToken();
        token.memberId = memberId;
        token.tokenHash = tokenHash;
        token.expiresAt = expiresAt;
        token.revoked = false;
        token.createdAt = LocalDateTime.now();
        return token;
    }

    public void revoke() {
        this.revoked = true;
    }

    public boolean isValid() {
        return !revoked && LocalDateTime.now().isBefore(expiresAt);
    }
}
