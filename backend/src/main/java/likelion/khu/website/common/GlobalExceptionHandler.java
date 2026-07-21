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
import likelion.khu.website.email.exception.EmailSendException;
import likelion.khu.website.feed.exception.InvalidImageFileException;
import likelion.khu.website.member.exception.MemberNotFoundException;
import likelion.khu.website.project.exception.DuplicateParticipantException;
import likelion.khu.website.project.exception.EmptyParticipantsException;
import likelion.khu.website.project.exception.InvalidRepresentativeImageException;
import likelion.khu.website.project.exception.NotProjectParticipantException;
import likelion.khu.website.project.exception.ParticipantMemberNotFoundException;
import likelion.khu.website.project.exception.ProjectNotFoundException;
import likelion.khu.website.project.exception.SelfNotIncludedException;
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

    // ── 프로젝트 쇼케이스(#119) — 블랙박스 QA에서 발견한 에러 계약 갭 수정.
    // 이전엔 ResponseStatusException을 그대로 던져 success/code 없는 Spring 기본 에러 바디가
    // 나갔다 — 다른 도메인과 형태가 달라 FE가 실패 사유를 분기할 수 없었다. ──

    @ExceptionHandler(ProjectNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleProjectNotFound(ProjectNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(ex.getMessage(), "PROJECT_NOT_FOUND"));
    }

    @ExceptionHandler(NotProjectParticipantException.class)
    public ResponseEntity<Map<String, Object>> handleNotProjectParticipant(NotProjectParticipantException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorBody(ex.getMessage(), "NOT_PARTICIPANT"));
    }

    @ExceptionHandler(SelfNotIncludedException.class)
    public ResponseEntity<Map<String, Object>> handleSelfNotIncluded(SelfNotIncludedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage(), "SELF_NOT_INCLUDED"));
    }

    @ExceptionHandler(DuplicateParticipantException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateParticipant(DuplicateParticipantException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage(), "DUPLICATE_PARTICIPANT"));
    }

    @ExceptionHandler(InvalidRepresentativeImageException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidRepresentativeImage(InvalidRepresentativeImageException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage(), "INVALID_REPRESENTATIVE_IMAGE"));
    }

    // 상태코드는 기존 팀 결정(상태공간트리 QA, ProjectControllerTest#create_NonExistentParticipantMemberId_Returns404)을
    // 그대로 따른다 — 404. code 필드만 새로 붙여 다른 참여자 검증(400)과 응답 형태는 통일한다.
    @ExceptionHandler(ParticipantMemberNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleParticipantMemberNotFound(ParticipantMemberNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(ex.getMessage(), "PARTICIPANT_NOT_FOUND"));
    }

    @ExceptionHandler(EmptyParticipantsException.class)
    public ResponseEntity<Map<String, Object>> handleEmptyParticipants(EmptyParticipantsException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(ex.getMessage(), "EMPTY_PARTICIPANTS"));
    }

    // ── 이메일 발송(#123) ── #113 QA에서 발견 — AdminInvitationService.invite()/
    // AdminPasswordResetService.forgot()가 EmailService.send()를 트랜잭션 안 마지막 단계로
    // 호출해서, SMTP 장애 시 이 예외가 컨트롤러 밖으로 그대로 새나가 핸들러 없는 채로 Spring
    // 기본 500 에러가 나갔다(email_log에 FAILURE는 비동기로 결국 남지만, 응답 자체는 다른
    // API와 형태가 다른 500이었음). 502로 "우리 문제가 아니라 외부 메일 서버 문제"임을 구분해
    // 응답한다 — 초대/토큰 레코드는 같은 트랜잭션이라 이미 롤백된 뒤라 재시도해도 안전(멱등,
    // 새 토큰으로 다시 발급됨). forgot()은 이 예외를 여기까지 오기 전에 자체적으로 삼켜서
    // 계정 열거 방지 스펙(#90)을 유지한다 — AdminPasswordResetService 주석 참고.
    @ExceptionHandler(EmailSendException.class)
    public ResponseEntity<Map<String, Object>> handleEmailSendFailure(EmailSendException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(errorBody("메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.", "EMAIL_SEND_FAILED"));
    }

    private Map<String, Object> errorBody(String message, String code) {
        return Map.of("success", false, "message", message, "code", code);
    }
}
