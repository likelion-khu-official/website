package likelion.khu.website.project.exception;

public class NotProjectParticipantException extends RuntimeException {
    public NotProjectParticipantException() {
        super("참여한 프로젝트만 수정·삭제할 수 있어요.");
    }
}
