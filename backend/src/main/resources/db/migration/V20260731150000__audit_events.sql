-- #338: 감사 로그 — 시스템에서 일어난 의미 있는 행위(상태변경·인증·민감 열람)를 남기는 append-only 테이블.
-- 앱에는 이 행을 수정·삭제하는 경로가 없다(AuditEventRepository가 save·조회만 노출). 순수 추가 마이그레이션.
-- id는 @GeneratedValue(IDENTITY)라 SQLite rowid 별칭 규칙에 맞춰 integer(applications 등과 동일 패턴).
-- occurred_at은 LocalDateTime → varchar(255)(submitted_at 등 기존 매핑과 동일, ISO 문자열이라 정렬=시간순).
create table audit_events (
    id integer,
    actor_type varchar(20) not null,
    actor_id bigint,
    actor_label varchar(255),
    action varchar(30) not null,
    http_method varchar(10),
    path varchar(500),
    outcome varchar(10) not null,
    status_code integer,
    client_ip varchar(45),
    occurred_at varchar(255) not null,
    primary key (id)
);

create index idx_audit_events_occurred_at on audit_events (occurred_at);
create index idx_audit_events_actor on audit_events (actor_type, actor_id);
