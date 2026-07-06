package likelion.khu.website.feed;

import likelion.khu.website.feed.dto.MagicLinkTokenIssueRequest;
import likelion.khu.website.feed.dto.MagicLinkTokenIssueResponse;
import likelion.khu.website.feed.dto.MagicLinkTokenStatusResponse;
import likelion.khu.website.feed.exception.MagicLinkTokenAlreadyUsedException;
import likelion.khu.website.feed.exception.MagicLinkTokenExpiredException;
import likelion.khu.website.feed.exception.MagicLinkTokenNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class MagicLinkTokenService {

    private static final Duration TTL = Duration.ofHours(24);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final MagicLinkTokenRepository repository;

    @Transactional
    public MagicLinkTokenIssueResponse issue(MagicLinkTokenIssueRequest request) {
        MagicLinkToken saved = repository.save(new MagicLinkToken(
                generateToken(),
                request.getAuthorName(),
                LocalDateTime.now().plus(TTL)
        ));
        return MagicLinkTokenIssueResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public MagicLinkTokenStatusResponse checkStatus(String token) {
        MagicLinkToken found = findByToken(token);
        if (found.isUsed()) {
            return MagicLinkTokenStatusResponse.invalid(found.getAuthorName(), "USED");
        }
        if (found.isExpired()) {
            return MagicLinkTokenStatusResponse.invalid(found.getAuthorName(), "EXPIRED");
        }
        return MagicLinkTokenStatusResponse.valid(found.getAuthorName());
    }

    // 글 작성 API(Post 도메인)가 매직링크로 제출을 받을 때 호출하는 진입점 —
    // 유효하면 1회성으로 소모(used=true)하고 작성자 이름을 돌려준다.
    @Transactional
    public String consume(String token) {
        MagicLinkToken found = findByToken(token);
        if (found.isUsed()) {
            throw new MagicLinkTokenAlreadyUsedException(token);
        }
        if (found.isExpired()) {
            throw new MagicLinkTokenExpiredException(token);
        }
        found.markUsed();
        return found.getAuthorName();
    }

    private MagicLinkToken findByToken(String token) {
        return repository.findByToken(token)
                .orElseThrow(() -> new MagicLinkTokenNotFoundException(token));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
