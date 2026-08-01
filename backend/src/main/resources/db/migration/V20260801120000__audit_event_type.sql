-- #344: 사람이 쓰는 summary를 파싱하지 않고 사건의 업무 영역을 필터링하기 위한 파생 분류.
-- 기존 감사 행의 의미 필드는 바꾸지 않고, 이미 저장된 action/target_type/path로 동일하게 재계산할 수 있는
-- 분류값만 추가한다. 신규 행은 AuditEvent 생성 시 같은 규칙으로 채운다.
alter table audit_events add column event_type varchar(30) not null default 'OTHER';

update audit_events
set event_type = case
    when action in ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT') then 'AUTHENTICATION'
    when action = 'SENSITIVE_READ' and path = '/api/admin/audit-logs' then 'AUDIT_REVIEW'
    when action = 'SENSITIVE_READ' then 'SENSITIVE_ACCESS'
    when target_type in ('ADMIN', 'ADMIN_INVITATION', 'MEMBER', 'STAFF') then 'PEOPLE_MANAGEMENT'
    when target_type in ('POST', 'COMMENT', 'PROJECT') then 'CONTENT_MANAGEMENT'
    when target_type = 'RECRUITMENT' then 'RECRUITMENT_MANAGEMENT'
    when target_type = 'APPLICATION_FORM' then 'APPLICATION_MANAGEMENT'
    else 'OTHER'
end;

create index idx_audit_events_event_type on audit_events (event_type, occurred_at);
