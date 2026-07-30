package likelion.khu.website.email;

// FAILURE 행에만 의미가 있음(SUCCESS는 null). EmailService.send()에서 실제로 발생하는 예외를
// 이 값들로 1:1에 가깝게 분류해서 email_log에 남긴다 — "유저/시스템" 두 갈래가 아니라, 재시도해도
// 결과가 바뀌는지(retryable)와 #113 알람이 사람을 불러야 하는지(alarmWorthy)를 각각 독립적으로
// 판단한다. 예를 들어 TEMPLATE_RENDERING_FAILED는 재시도해도 소용없지만(코드 버그, 컨텍스트가 안
// 바뀌면 매번 같은 결과) 우리가 고쳐야 하는 문제라 알람은 울려야 한다 — 두 축이 항상 같이 가지 않는다.
public enum FailureCause {

    // 수신 주소 형식 자체가 잘못됨(AddressException, InternetAddress.validate()) — 재시도해도
    // 결과가 똑같고, 우리가 손볼 수 없는 수신자 쪽 원인이라 알람 대상도 아니다.
    RECIPIENT_ADDRESS_INVALID(false, false),

    // 형식은 맞는데 SMTP 서버가 실제로 거부함(SendFailedException — 메일함 없음·가득참 등).
    // OCI 릴레이는 정상이고, 문제는 그 수신자 메일함 쪽이라 재시도·알람 둘 다 대상 아니다.
    RECIPIENT_REJECTED_BY_SERVER(false, false),

    // 호출자가 잘못된 입력을 줌(예: 수신자 null → NullPointerException) — 재시도해도 똑같이
    // 실패하는 결정론적 오류지만, 원인이 우리 코드/호출자에 있으므로 알람은 울려야 한다.
    INVALID_INPUT(false, true),

    // Thymeleaf 템플릿 렌더링 자체가 깨짐(TemplateProcessingException) — 배포된 코드 버그.
    // 재시도해도 안 풀리지만(같은 템플릿·컨텍스트면 매번 같은 결과), 우리가 고쳐야 하는 문제.
    TEMPLATE_RENDERING_FAILED(false, true),

    // SMTP 자격증명 인증 실패(MailAuthenticationException) — 우리 쪽(인프라) 원인, 재시도 대상.
    SMTP_AUTHENTICATION_FAILED(true, true),

    // 그 외 SMTP 전송 실패(연결 거부·타임아웃 등, MailException 계열) — 우리 쪽(인프라) 원인,
    // 순간 장애일 수 있어 재시도 대상.
    SMTP_CONNECTION_FAILED(true, true),

    // 위 어디에도 안 걸리는 예외 — 원인을 모르므로 "놓치는 것보다 오탐이 낫다" 원칙으로 재시도·
    // 알람 둘 다 대상에 포함시킨다.
    UNKNOWN_FAILURE(true, true);

    private final boolean retryable;
    private final boolean alarmWorthy;

    FailureCause(boolean retryable, boolean alarmWorthy) {
        this.retryable = retryable;
        this.alarmWorthy = alarmWorthy;
    }

    public boolean isRetryable() {
        return retryable;
    }

    // 지금은 Java 쪽에서 직접 안 쓰인다(#113 알람 필터링은 push-email-failure-metric.py가 SQL로
    // 함) — 그래도 "어떤 값이 알람 대상인가"라는 판단을 이 enum에 같이 두는 이유는, 값이 늘어날 때
    // 마다 그 판단 기준을 Python 스크립트 코드가 아니라 여기서 먼저 정하고 스크립트는 그걸 그대로
    // 옮기게 하기 위함(단일 출처). 스크립트 쪽 목록을 고칠 땐 이 값과 반드시 대조할 것.
    public boolean isAlarmWorthy() {
        return alarmWorthy;
    }
}
