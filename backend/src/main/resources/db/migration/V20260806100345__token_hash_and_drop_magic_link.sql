-- dbclient(SELECT 자유) 계정으로 살아있는 크리덴셜 토큰이 평문으로 읽히는 문제 대응.
-- refresh_tokens/member_refresh_tokens가 이미 쓰는 token_hash 패턴(SHA-256, 애플리케이션에서 해시해 저장)으로
-- password_reset_tokens·admin_invitations를 통일한다. 두 테이블 다 살아있는 값을 그대로 옮길 방법이 없다
-- (해시는 애플리케이션 코드에서만 계산 가능, SQLite SQL엔 SHA-256 내장 함수가 없음) — 기존 행은 버린다.
-- password_reset_tokens는 TTL 30분이라 배포 시점엔 사실상 전부 만료·소진된 상태고, admin_invitations는
-- TTL 72시간이라 배포 시점에 대기 중인 초대가 있으면 무효화된다 — 그 초대는 재발송하면 된다
-- (AdminInvitationService.invite()가 이미 "대기 중인 초대가 있으면 취소 후 재발급"을 멱등하게 처리).

create table password_reset_tokens_new (
    used boolean not null,
    admin_id bigint not null,
    id integer,
    created_at varchar(255) not null,
    expires_at varchar(255) not null,
    token_hash varchar(255) not null unique,
    primary key (id)
);
drop table password_reset_tokens;
alter table password_reset_tokens_new rename to password_reset_tokens;

create table admin_invitations_new (
    id integer,
    created_at varchar(255) not null,
    email varchar(255) not null,
    expires_at varchar(255) not null,
    invited_by_email varchar(255) not null,
    status varchar(255) not null check (status in ('PENDING','ACCEPTED','CANCELLED')),
    token_hash varchar(255) not null unique,
    primary key (id)
);
drop table admin_invitations;
alter table admin_invitations_new rename to admin_invitations;

-- magic_link_tokens: 기능 자체는 910ce49(2026-07-21)에서 코드까지 완전히 삭제됐지만, 그 시점엔
-- Flyway 도입 전(ddl-auto: update)이라 테이블은 DROP 마이그레이션 없이 stage/prod에 그대로 남아있었다.
-- 죽은 테이블에 옛 평문 토큰이 방치돼 있던 상태 — token_hash로 옮길 코드 자체가 없으니 통째로 제거한다.
drop table if exists magic_link_tokens;
