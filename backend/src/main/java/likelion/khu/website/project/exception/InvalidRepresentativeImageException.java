package likelion.khu.website.project.exception;

public class InvalidRepresentativeImageException extends RuntimeException {
    public InvalidRepresentativeImageException() {
        super("대표 이미지를 정확히 1장 지정해주세요.");
    }
}
