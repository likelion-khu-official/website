package likelion.khu.website.feed.dto;

import likelion.khu.website.feed.MagicLinkToken;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class MagicLinkTokenIssueResponse {
    private String token;
    private String authorName;
    private LocalDateTime expiresAt;

    public static MagicLinkTokenIssueResponse from(MagicLinkToken magicLinkToken) {
        return new MagicLinkTokenIssueResponse(
                magicLinkToken.getToken(),
                magicLinkToken.getAuthorName(),
                magicLinkToken.getExpiresAt()
        );
    }
}
