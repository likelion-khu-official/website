package likelion.khu.website.feed.exception;

public class MagicLinkTokenAlreadyUsedException extends RuntimeException {
    public MagicLinkTokenAlreadyUsedException(String token) {
        super("이미 사용된 매직링크 토큰이에요.");
    }
}
