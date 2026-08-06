package likelion.khu.website.admin.password;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
    boolean existsByAdminIdAndUsedFalseAndExpiresAtAfter(Long adminId, LocalDateTime now);
}
