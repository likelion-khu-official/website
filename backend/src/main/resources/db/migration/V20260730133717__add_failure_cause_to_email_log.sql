-- #113 후속(장찬욱 요청) — email_log의 FAILURE가 유저 원인(주소 형식 오류)인지 우리 쪽 원인(SMTP
-- 장애 등)인지 구분해서, 실패 임계치 알람(push-email-failure-metric.py)이 유저 원인은 세지 않게 한다.
-- SUCCESS 행과 이 컬럼 도입 이전의 기존 FAILURE 행은 전부 null — CHECK는 null을 통과시키므로
-- nullable 컬럼 추가만으로 충분하다(재생성 패턴 불필요, db-man 스킬 "컬럼 추가(nullable)" 케이스).
alter table email_log add column failure_cause varchar(255) check (failure_cause in ('USER_CAUSED', 'SYSTEM_CAUSED'));
