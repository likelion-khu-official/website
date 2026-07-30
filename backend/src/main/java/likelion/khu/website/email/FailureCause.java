package likelion.khu.website.email;

// FAILURE 행에만 의미가 있음(SUCCESS는 null) — #113 실패 임계치 알람이 유저 원인은 세지 않도록
// email_log에 원인을 구분해서 남긴다. String이 아니라 enum인 이유는 EmailStatus와 동일(오타 방지).
public enum FailureCause {
    // 수신 주소 형식 자체가 잘못됨(AddressException) — 재시도해도 결과가 똑같은 유저 쪽 원인.
    USER_CAUSED,
    // 그 외(SMTP 연결·인증 실패, 템플릿 렌더링 예외 등) — 우리 쪽·인프라 쪽 원인일 가능성이 높음,
    // 재시도(EmailService)로도 안 풀리면 email_log에 이 값으로 남아 알람 대상이 된다.
    SYSTEM_CAUSED
}
