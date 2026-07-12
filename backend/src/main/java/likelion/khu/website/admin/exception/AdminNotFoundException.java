package likelion.khu.website.admin.exception;

public class AdminNotFoundException extends RuntimeException {
    public AdminNotFoundException() {
        super("존재하지 않는 운영진이에요.");
    }
}
