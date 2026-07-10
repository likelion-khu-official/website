package likelion.khu.website.admin.exception;

public class AdminAlreadyMemberException extends RuntimeException {
    public AdminAlreadyMemberException() {
        super("이미 등록된 운영진이에요.");
    }
}
