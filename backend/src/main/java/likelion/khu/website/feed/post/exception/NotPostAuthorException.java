package likelion.khu.website.feed.post.exception;

public class NotPostAuthorException extends RuntimeException {
    public NotPostAuthorException() {
        super("본인이 작성한 글만 수정·삭제할 수 있어요.");
    }
}
