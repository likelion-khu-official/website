package likelion.khu.website.admin.password;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
@Getter
@NoArgsConstructor
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "integer")
    private Long id;

    // 원문 토큰이 아니라 SHA-256 해시만 저장 — dbclient로 DB를 SELECT해도 살아있는 재설정 토큰을
    // 그대로 못 읽게 하기 위함. RefreshToken과 동일 패턴.
    @Column(nullable = false, unique = true)
    private String tokenHash;

    @Column(nullable = false, columnDefinition = "bigint")
    private Long adminId;

    @Column(nullable = false)
    private boolean used;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static PasswordResetToken issue(Long adminId, String tokenHash, Duration ttl) {
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.adminId = adminId;
        resetToken.tokenHash = tokenHash;
        resetToken.used = false;
        resetToken.expiresAt = LocalDateTime.now().plus(ttl);
        resetToken.createdAt = LocalDateTime.now();
        return resetToken;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public void markUsed() {
        this.used = true;
    }
}
