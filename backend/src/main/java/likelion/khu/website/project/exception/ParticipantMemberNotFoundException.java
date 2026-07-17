package likelion.khu.website.project.exception;

// 참여자로 넘어온 memberId가 존재하지 않는 멤버 — path의 리소스가 아니라 요청 바디 안의 값이라
// 다른 참여자 검증(자기제외·중복)과 같은 400으로 다룬다. 404로 두면 같은 요청 바디 검증군인데도
// FE 에러 처리 분기가 하나 더 필요해진다(#119 블랙박스 QA에서 발견).
public class ParticipantMemberNotFoundException extends RuntimeException {
    public ParticipantMemberNotFoundException() {
        super("참여자로 등록하려는 멤버를 찾을 수 없어요.");
    }
}
