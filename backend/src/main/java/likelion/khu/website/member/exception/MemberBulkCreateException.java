package likelion.khu.website.member.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class MemberBulkCreateException extends RuntimeException {

    private final HttpStatus status;
    private final int index;
    private final String field;

    public MemberBulkCreateException(HttpStatus status, int index, String field, String message) {
        super((index + 1) + "번째 멤버의 " + field + ": " + message);
        this.status = status;
        this.index = index;
        this.field = field;
    }
}
