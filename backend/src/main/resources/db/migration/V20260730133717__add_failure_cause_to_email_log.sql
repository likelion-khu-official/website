-- #113 후속(장찬욱 요청) — email_log의 FAILURE를 원인별로 세분화해서 남긴다. "유저/시스템" 이분법이
-- 아니라 EmailService.classify()가 실제로 구분하는 7가지(FailureCause.java 참고) — 재시도 대상
-- 여부와 실패 임계치 알람(push-email-failure-metric.py) 대상 여부가 값마다 다르다.
-- SUCCESS 행과 이 컬럼 도입 이전의 기존 FAILURE 행은 전부 null — CHECK는 null을 통과시키므로
-- nullable 컬럼 추가만으로 충분하다(재생성 패턴 불필요, db-man 스킬 "컬럼 추가(nullable)" 케이스).
alter table email_log add column failure_cause varchar(255) check (failure_cause in (
    'RECIPIENT_ADDRESS_INVALID',
    'RECIPIENT_REJECTED_BY_SERVER',
    'INVALID_INPUT',
    'TEMPLATE_RENDERING_FAILED',
    'SMTP_AUTHENTICATION_FAILED',
    'SMTP_CONNECTION_FAILED',
    'UNKNOWN_FAILURE'
));
