package likelion.khu.website.feed.post.exception;

public class PostNotFoundException extends RuntimeException {
    public PostNotFoundException() {
        super("글을 찾을 수 없어요.");
    }
}
