package likelion.khu.website.email.exception;

import likelion.khu.website.email.EmailType;

// unchecked(RuntimeException)로 만들어 호출부가 매번 try/catch·throws를 강제로 안 써도 되게 함
// — 상위(예: GlobalExceptionHandler)에서 이 타입 하나만 잡아 일관되게 처리하는 걸 의도.
// 지금은 주소 형식 오류·SMTP 전송 실패가 이 타입 하나로 뭉뚱그려짐 — 필요해지면 원인별로 분리 검토(email-module.md 참고).
public class EmailSendException extends RuntimeException {

    public EmailSendException(EmailType type, String recipient, Throwable cause) {
        // cause를 그대로 보존 — 로그에서 "표면은 EmailSendException, 진짜 원인은 cause"까지 추적 가능하게.
        super("메일 발송 실패 (종류: " + type + ", 수신자: " + recipient + ")", cause);
    }
}
