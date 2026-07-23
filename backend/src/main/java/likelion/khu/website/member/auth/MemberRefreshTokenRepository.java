package likelion.khu.website.member.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRefreshTokenRepository extends JpaRepository<MemberRefreshToken, Long> {
    Optional<MemberRefreshToken> findByTokenHash(String tokenHash);

    List<MemberRefreshToken> findAllByMemberIdAndRevokedFalse(Long memberId);
}
