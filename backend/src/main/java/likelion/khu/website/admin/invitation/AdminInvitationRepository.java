package likelion.khu.website.admin.invitation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminInvitationRepository extends JpaRepository<AdminInvitation, Long> {
    Optional<AdminInvitation> findByToken(String token);
    List<AdminInvitation> findAllByOrderByCreatedAtDesc();
    Optional<AdminInvitation> findByEmailAndStatus(String email, InvitationStatus status);
}
