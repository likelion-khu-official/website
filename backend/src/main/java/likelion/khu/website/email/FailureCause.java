package likelion.khu.website.email;

// FAILURE 행에만 의미가 있음(SUCCESS는 null). EmailService.send()에서 실제로 발생하는 예외를
// 이 값들로 1:1에 가깝게 분류해서 email_log에 남긴다 — "유저/시스템" 두 갈래가 아니라, 재시도해도
// 결과가 바뀌는지(retryable)와 #113 알람이 사람을 불러야 하는지(alarmWorthy)를 각각 독립적으로
// 판단한다. 예를 들어 TEMPLATE_RENDERING_FAILED는 재시도해도 소용없지만(코드 버그, 컨텍스트가 안
// 바뀌면 매번 같은 결과) 우리가 고쳐야 하는 문제라 알람은 울려야 한다 — 두 축이 항상 같이 가지 않는다.
//
// 각 값의 실제 SMTP 동작은 OCI Email Delivery 공식 트러블슈팅 문서
// (https://docs.oracle.com/en-us/iaas/Content/Email/Concepts/troubleshooting.htm)의 응답
// 코드·메시지를 근거로 삼았다 — Mailpit(테스트 도구)이 흉내 낼 수 있는 부분과 없는 부분이 갈리므로,
// "우리 코드가 이 예외 타입을 올바르게 처리하는가"(Mailpit·단위테스트로 검증됨)와 "OCI가 실제로 이
// 신호를 이렇게 준다는 것"(문서로만 확인, 프로덕션 자격증명으로 직접 재현은 안 함) 둘을 구분해서
// 읽을 것 — backend/docs/email-module.md "실패 원인 분류" 절 참고.
public enum FailureCause {

    // 수신 주소 형식 자체가 잘못됨(AddressException, InternetAddress.validate()) — 우리 클라이언트
    // 쪽 검증에서 걸림. 재시도해도 결과가 똑같고, 우리가 손볼 수 없는 수신자 쪽 원인이라 알람 대상도
    // 아니다.
    RECIPIENT_ADDRESS_INVALID(false, false),

    // 우리 클라이언트 쪽 검증은 통과했는데 OCI가 RCPT 단계에서 자체 재검증(RFC-822 형식) 후 거부함
    // (SendFailedException, OCI 문서 553 "Invalid email address"). "메일함이 존재하지 않음/가득참"이
    // 아니다 — 그건 OCI가 접수 시점에 동기로 알 수 있는 정보가 아니라 뒷단(수신 메일서버)과의 비동기
    // 릴레이 결과라 mailSender.send()가 예외를 던지는 시점엔 알 수 없다(infra/docs/email-delivery.md
    // "①우리→OCI"/"②OCI→수신 메일서버" 계층 구분 참고, 그 ②단계는 OCI Logging을 별도 조회해야
    // 나오는 값이라 이 예외 경로엔 안 잡힘). 즉 이 값도 결국 "주소 형식 문제"의 연장이라 재시도·알람
    // 둘 다 대상 아니다 — 다만 "우리 검증이 놓친 걸 OCI가 잡아준 경우"라 값이 계속 쌓이면 우리 쪽
    // InternetAddress.validate()의 검증 허점을 의심해볼 신호는 된다.
    RECIPIENT_ADDRESS_REJECTED_BY_SERVER(false, false),

    // 호출자가 잘못된 입력을 줌(예: 수신자 null → NullPointerException) — 재시도해도 똑같이
    // 실패하는 결정론적 오류지만, 원인이 우리 코드/호출자에 있으므로 알람은 울려야 한다.
    INVALID_INPUT(false, true),

    // Thymeleaf 템플릿 렌더링 자체가 깨짐(TemplateProcessingException) — 배포된 코드 버그.
    // 재시도해도 안 풀리지만(같은 템플릿·컨텍스트면 매번 같은 결과), 우리가 고쳐야 하는 문제.
    TEMPLATE_RENDERING_FAILED(false, true),

    // SMTP 자격증명 인증 실패(MailAuthenticationException, OCI 문서 535 "Authentication
    // credentials invalid"). 우리 쪽(인프라) 원인이라 알람 대상이지만, 재시도는 하지 않는다 — OCI
    // 문서에 "421 Too many auth failures, try again later"(반복된 인증 실패에 대한 IP 단위 스로틀)가
    // 별도로 명시돼 있어서다. 자격증명이 실제로 깨졌을 때 우리가 자동으로 여러 번 재시도하면 이
    // 스로틀을 스스로 유발할 수 있고, 스로틀은 그 IP(=우리 서버)에서 나가는 다른(정상적인) 메일
    // 발송까지 함께 막을 위험이 있다 — 한 통의 재시도 이득보다 전체 발신 경로를 막을 위험이 훨씬
    // 크므로 즉시 포기한다.
    SMTP_AUTHENTICATION_FAILED(false, true),

    // 그 외 SMTP 전송 실패(연결 거부·타임아웃, 421 일시 서비스 장애 등 MailException 계열) — 우리
    // 쪽(인프라) 원인이거나 OCI 쪽 일시 장애, 순간적일 수 있어 재시도 대상.
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
