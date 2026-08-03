package likelion.khu.website.application.exception;

// 모집이 열려 있지 않을 때 지원 제출을 거부(#152). 409로 매핑(GlobalExceptionHandler).
public class RecruitmentClosedException extends RuntimeException {
    public RecruitmentClosedException() {
        super("지금은 모집 기간이 아니에요.");
    }
}
