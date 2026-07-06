package likelion.khu.website.feed.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MagicLinkTokenStatusResponse {
    private String authorName;
    private boolean valid;
    private String reason;

    public static MagicLinkTokenStatusResponse valid(String authorName) {
        return new MagicLinkTokenStatusResponse(authorName, true, null);
    }

    public static MagicLinkTokenStatusResponse invalid(String authorName, String reason) {
        return new MagicLinkTokenStatusResponse(authorName, false, reason);
    }
}
