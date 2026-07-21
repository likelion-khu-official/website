package likelion.khu.website.project.exception;

public class EmptyParticipantsException extends RuntimeException {
    public EmptyParticipantsException() {
        super("참여 멤버는 최소 1명 있어야 해요.");
    }
}
