package likelion.khu.website.feed.exception;

public class MagicLinkTokenNotFoundException extends RuntimeException {
    public MagicLinkTokenNotFoundException(String token) {
        super("존재하지 않는 매직링크 토큰이에요.");
    }
}
