package likelion.khu.website.common;

import likelion.khu.website.admin.exception.AccountLockedException;
import likelion.khu.website.admin.exception.AdminAlreadyMemberException;
import likelion.khu.website.admin.exception.AdminInvitationAlreadyProcessedException;
import likelion.khu.website.admin.exception.AdminInvitationExpiredException;
import likelion.khu.website.admin.exception.AdminInvitationIdNotFoundException;
import likelion.khu.website.admin.exception.AdminInvitationNotFoundException;
import likelion.khu.website.admin.exception.AdminNotFoundException;
import likelion.khu.website.admin.exception.InvalidCredentialsException;
import likelion.khu.website.admin.exception.InvalidEmailDomainException;
import likelion.khu.website.admin.exception.InvalidRefreshTokenException;
import likelion.khu.website.admin.exception.LastSuperAdminException;
import likelion.khu.website.admin.exception.PasswordResetTokenExpiredException;
import likelion.khu.website.admin.exception.PasswordResetTokenNotFoundException;
import likelion.khu.website.admin.exception.WeakPasswordException;
import likelion.khu.website.feed.exception.InvalidImageFileException;
import likelion.khu.website.feed.exception.MagicLinkTokenAlreadyUsedException;
import likelion.khu.website.feed.exception.MagicLinkTokenExpiredException;
import likelion.khu.website.feed.exception.MagicLinkTokenNotFoundException;
import likelion.khu.website.member.exception.MemberNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("입력값이 올바르지 않아요.");
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("success", false, "message", message));
    }

    @ExceptionHandler(MagicLinkTokenNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleTokenNotFound(MagicLinkTokenNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "message", ex.getMessage()));
    }

    @ExceptionHandler({MagicLinkTokenAlreadyUsedException.class, MagicLinkTokenExpiredException.class})
    public ResponseEntity<Map<String, Object>> handleTokenInvalid(RuntimeException ex) {
        return ResponseEntity
                .status(HttpStatus.GONE)
                .body(Map.of("success", false, "message", ex.getMessage()));
    }

    @ExceptionHandler(InvalidImageFileException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidImage(InvalidImageFileException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("success", false, "message", ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return ResponseEntity
                .status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Map.of("success", false, "message", "이미지 용량이 너무 커요 (최대 5MB)."));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("success", false, "message", ex.getMessage()));
    }

    // ── 어드민 인증(#90) — 이 모듈만 기존 success/message 2키에 code(FE가 분기할 짧은 문자열)를 얹는다 ──

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorBody(ex.getMessage(), "INVALID_CREDENTIALS"));
    }

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<Map<String, Object>> handleAccountLocked(AccountLockedException ex) {
        return ResponseEntity.status(HttpStatus.LOCKED).body(errorBody(ex.getMessage(), "ACCOUNT_LOCKED"));
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidRefreshToken(InvalidRefreshTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorBody(ex.getMessage(), "INVALID_REFRESH_TOKEN"));
    }

    @ExceptionHandler(InvalidEmailDomainException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidEmailDomain(InvalidEmailDomainException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage(), "INVALID_EMAIL_DOMAIN"));
    }

    @ExceptionHandler(AdminAlreadyMemberException.class)
    public ResponseEntity<Map<String, Object>> handleAdminAlreadyMember(AdminAlreadyMemberException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorBody(ex.getMessage(), "ALREADY_MEMBER"));
    }

    @ExceptionHandler({AdminInvitationNotFoundException.class, AdminInvitationAlreadyProcessedException.class,
            PasswordResetTokenNotFoundException.class})
    public ResponseEntity<Map<String, Object>> handleAdminTokenInvalid(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage(), "INVALID_TOKEN"));
    }

    @ExceptionHandler({AdminInvitationExpiredException.class, PasswordResetTokenExpiredException.class})
    public ResponseEntity<Map<String, Object>> handleAdminTokenExpired(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.GONE).body(errorBody(ex.getMessage(), "EXPIRED_TOKEN"));
    }

    @ExceptionHandler(WeakPasswordException.class)
    public ResponseEntity<Map<String, Object>> handleWeakPassword(WeakPasswordException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage(), "WEAK_PASSWORD"));
    }

    @ExceptionHandler(LastSuperAdminException.class)
    public ResponseEntity<Map<String, Object>> handleLastSuperAdmin(LastSuperAdminException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorBody(ex.getMessage(), "LAST_SUPER_ADMIN"));
    }

    @ExceptionHandler(AdminNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleAdminNotFound(AdminNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(ex.getMessage(), "NOT_FOUND"));
    }

    @ExceptionHandler(AdminInvitationIdNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleAdminInvitationIdNotFound(AdminInvitationIdNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(ex.getMessage(), "NOT_FOUND"));
    }

    // ── 멤버 인증(#117) ──────────────────────────────────────────────

    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleMemberNotFound(MemberNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(ex.getMessage(), "NOT_FOUND"));
    }

    private Map<String, Object> errorBody(String message, String code) {
        return Map.of("success", false, "message", message, "code", code);
    }
}
