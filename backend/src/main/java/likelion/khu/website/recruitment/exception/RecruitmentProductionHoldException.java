package likelion.khu.website.recruitment.exception;

public class RecruitmentProductionHoldException extends RuntimeException {
    public RecruitmentProductionHoldException() {
        super("지원폼이 아직 준비되지 않아 이 환경에서는 모집을 열 수 없어요.");
    }
}
