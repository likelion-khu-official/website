-- #113 후속 — email_log.email_type의 CHECK 제약이 RECRUITMENT_OPEN(#124, EmailType.java)을
-- 빠뜨린 채 방치돼 있던 걸 바로잡는다.
--
-- #124에서 EmailType enum에 RECRUITMENT_OPEN을 추가했을 때, 당시 ddl-auto:update가 SQLite
-- ALTER TABLE(CHECK 제약 변경)을 조용히 실패시켜 실제 DB엔 반영이 안 됐다. 그 뒤 #133에서
-- V1__baseline.sql을 "그 시점 엔티티가 생성하는 스키마"로 캡처하면서 파일에는 3개 값이
-- 올바르게 적혔지만, baseline-on-migrate가 "이미 떠 있는 stage/prod는 V1과 같다"고만 믿고
-- 넘어가는 바람에(실제로 검증한 ddl-auto=validate는 CHECK 제약 내용을 안 봄) 실제 stage/prod
-- DB의 CHECK 제약은 계속 2개 값에 머물러 있었다(실측 확인, 2026-07-30). 이 상태에서
-- RECRUITMENT_OPEN 메일을 보내면 email_log INSERT가 CHECK 위반으로 실패한다.
--
-- CHECK 넓히기(기존 값 손실 없음)라 SQLite ALTER TABLE로 못 하는 건 동일 — 재생성 패턴 사용.
create table email_log_new (
    id integer,
    email_type varchar(255) not null check (email_type in ('INVITE', 'PASSWORD_RESET', 'RECRUITMENT_OPEN')),
    error_message varchar(1000),
    message_id varchar(255) unique,
    recipient varchar(255) not null,
    sent_at timestamp not null,
    status varchar(255) not null check (status in ('SUCCESS', 'FAILURE')),
    subject varchar(255) not null,
    failure_cause varchar(255) check (failure_cause in (
        'RECIPIENT_ADDRESS_INVALID',
        'RECIPIENT_ADDRESS_REJECTED_BY_SERVER',
        'INVALID_INPUT',
        'TEMPLATE_RENDERING_FAILED',
        'SMTP_AUTHENTICATION_FAILED',
        'SMTP_CONNECTION_FAILED',
        'UNKNOWN_FAILURE'
    )),
    primary key (id)
);

insert into email_log_new (id, email_type, error_message, message_id, recipient, sent_at, status, subject, failure_cause)
select id, email_type, error_message, message_id, recipient, sent_at, status, subject, failure_cause
from email_log;

drop table email_log;

alter table email_log_new rename to email_log;
