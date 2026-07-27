-- #133: ddl-auto(update)가 SQLite ALTER TABLE 실패를 삼켜 스키마 드리프트가 나던 문제의 해결책으로
-- Flyway를 도입하며 쓰는 baseline. 지금 시점의 엔티티 매핑이 실제로 생성하는 DDL을 그대로 옮긴 것
-- (ddl-auto=create로 빈 DB에 직접 띄워 Hibernate가 낸 SQL을 캡처 + 로컬/stage DB 사본에 대고
-- ddl-auto=validate로 실측 검증까지 마침).
--
-- 이미 떠 있는 stage·prod는 이 파일을 실행하지 않고 flyway_schema_history에 "이미 V1까지 적용됨"으로만
-- 표시된다(spring.flyway.baseline-on-migrate=true) — 두 서버 모두 이 스키마와 실질적으로 동일한 상태임을
-- ddl-auto=validate로 먼저 확인했다. 이 파일이 실제로 실행되는 건 새로 뜨는 빈 DB(로컬 개발 등)뿐이다.

create table admin_invitations (
    id integer,
    created_at varchar(255) not null,
    email varchar(255) not null,
    expires_at varchar(255) not null,
    invited_by_email varchar(255) not null,
    status varchar(255) not null check (status in ('PENDING','ACCEPTED','CANCELLED')),
    token varchar(255) not null unique,
    primary key (id)
);

create table admins (
    failed_login_attempts integer not null,
    id integer,
    created_at varchar(255) not null,
    email varchar(255) not null unique,
    locked_until varchar(255),
    name varchar(255) not null,
    password_hash varchar(255) not null,
    role varchar(255) not null check (role in ('SUPER_ADMIN','ADMIN')),
    updated_at varchar(255) not null,
    primary key (id)
);

create table comments (
    hidden boolean not null,
    id integer,
    post_id bigint not null,
    content TEXT not null,
    created_at varchar(255) not null,
    nickname varchar(255),
    primary key (id)
);

create table email_log (
    id integer,
    error_message varchar(1000),
    email_type varchar(255) not null check (email_type in ('INVITE','PASSWORD_RESET','RECRUITMENT_OPEN')),
    message_id varchar(255) unique,
    recipient varchar(255) not null,
    sent_at varchar(255) not null,
    status varchar(255) not null check (status in ('SUCCESS','FAILURE')),
    subject varchar(255) not null,
    primary key (id)
);

create table member_refresh_tokens (
    revoked boolean not null,
    id integer,
    member_id bigint not null,
    created_at varchar(255) not null,
    expires_at varchar(255) not null,
    token_hash varchar(255) not null unique,
    primary key (id)
);

create table member_roles (
    member_id bigint not null,
    role varchar(255) check (role in ('PM','FE','BE','DESIGN','INFRA'))
);

create table members (
    cohort integer not null,
    failed_login_attempts integer not null,
    must_change_password boolean not null,
    id integer,
    created_at varchar(255) not null,
    created_by varchar(255) not null,
    emoji varchar(255) not null,
    join_reason TEXT,
    locked_until varchar(255),
    name varchar(255) not null,
    password_hash varchar(255) not null,
    phone varchar(255) not null,
    photo_url varchar(255),
    student_id varchar(255) not null unique,
    updated_at varchar(255) not null,
    updated_by varchar(255) not null,
    primary key (id)
);

create table notification_subscriptions (
    id integer,
    created_at varchar(255) not null,
    email varchar(255) not null unique,
    primary key (id)
);

create table password_reset_tokens (
    used boolean not null,
    admin_id bigint not null,
    id integer,
    created_at varchar(255) not null,
    expires_at varchar(255) not null,
    token varchar(255) not null unique,
    primary key (id)
);

create table posts (
    id integer,
    author_name varchar(255) not null,
    author_part varchar(255),
    content TEXT not null,
    created_at varchar(255) not null,
    published_at varchar(255),
    slug varchar(255) not null unique,
    status varchar(255) not null check (status in ('DRAFT','PUBLISHED','HIDDEN')),
    summary TEXT,
    thumbnail_url varchar(255),
    title varchar(255) not null,
    updated_at varchar(255) not null,
    primary key (id)
);

create table project_images (
    representative boolean not null,
    id integer,
    project_id bigint not null,
    url varchar(255) not null,
    primary key (id)
);

create table project_participants (
    id integer,
    member_id bigint not null,
    project_id bigint not null,
    part varchar(255) not null check (part in ('PM','FE','BE','DESIGN','INFRA')),
    primary key (id)
);

create table project_tech_stack (
    project_id bigint not null,
    tech varchar(255)
);

create table projects (
    cohort integer not null,
    end_date date,
    hidden boolean not null,
    start_date date,
    id integer,
    created_at varchar(255) not null,
    github_url varchar(255),
    summary TEXT not null,
    title varchar(255) not null,
    updated_at varchar(255) not null,
    primary key (id)
);

create table recruitment_status (
    open boolean not null,
    id bigint not null,
    opened_at varchar(255),
    primary key (id)
);

create table refresh_tokens (
    revoked boolean not null,
    admin_id bigint not null,
    id integer,
    created_at varchar(255) not null,
    expires_at varchar(255) not null,
    token_hash varchar(255) not null unique,
    primary key (id)
);

create table staff (
    admission_year integer not null,
    sort_order integer not null,
    id integer,
    created_at varchar(255) not null,
    created_by varchar(255) not null,
    department varchar(255) not null,
    introduction TEXT,
    name varchar(255) not null,
    photo_url varchar(255) not null,
    position varchar(255) not null,
    updated_at varchar(255) not null,
    updated_by varchar(255) not null,
    primary key (id)
);
