package likelion.khu.website.project.exception;

public class SelfNotIncludedException extends RuntimeException {
    public SelfNotIncludedException() {
        super("본인을 참여 멤버에 포함해주세요.");
    }
}
