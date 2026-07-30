-- 어드민 권한 모델을 SUPER_ADMIN/ADMIN 2단계에서 단일 관리자로 통합 — role 컬럼과
-- 그 CHECK 제약을 제거한다. SQLite는 CHECK 제약이 걸린 컬럼을 ALTER TABLE DROP COLUMN으로
-- 지울 수 없으므로 테이블 재생성 패턴을 쓴다.
create table admins_new (
    id integer,
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    name varchar(255) not null,
    failed_login_attempts integer not null,
    locked_until varchar(255),
    created_at varchar(255) not null,
    updated_at varchar(255) not null,
    primary key (id)
);

insert into admins_new (id, email, password_hash, name, failed_login_attempts, locked_until, created_at, updated_at)
select id, email, password_hash, name, failed_login_attempts, locked_until, created_at, updated_at
from admins;

drop table admins;

alter table admins_new rename to admins;
