package likelion.khu.website.audit;

// 감사에 남기는 행위의 종류. 상태변경과 열람은 서버 경계 필터가, 인증(로그인/로그아웃)은 각 AuthService가 남긴다.
public enum AuditAction {
    STATE_CHANGE,   // 데이터를 만들거나 바꾸거나 지운 행위
    LOGIN_SUCCESS,
    LOGIN_FAILURE,
    LOGOUT,
    SENSITIVE_READ  // 지원자 개인정보 등 민감 정보 열람
}
