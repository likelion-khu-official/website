package likelion.khu.website.audit;

// 행위의 결과. 상태변경·열람은 HTTP 응답 코드로, 인증은 성공/실패로 갈린다.
public enum AuditOutcome {
    SUCCESS,
    FAILURE
}
