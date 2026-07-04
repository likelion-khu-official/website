package likelion.khu.website.common;

import likelion.khu.website.feed.exception.InvalidImageFileException;
import likelion.khu.website.feed.exception.MagicLinkTokenAlreadyUsedException;
import likelion.khu.website.feed.exception.MagicLinkTokenExpiredException;
import likelion.khu.website.feed.exception.MagicLinkTokenNotFoundException;
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
}
