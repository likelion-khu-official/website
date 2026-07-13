package likelion.khu.website.feed.exception;

public class MagicLinkTokenExpiredException extends RuntimeException {
    public MagicLinkTokenExpiredException(String token) {
        super("만료된 매직링크 토큰이에요.");
    }
}
