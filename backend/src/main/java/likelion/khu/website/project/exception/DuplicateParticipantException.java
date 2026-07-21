package likelion.khu.website.project.exception;

public class DuplicateParticipantException extends RuntimeException {
    public DuplicateParticipantException() {
        super("참여 멤버가 중복돼 있어요.");
    }
}
