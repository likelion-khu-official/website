-- MemberRole 확장: PM/FE/BE/DESIGN/AI/INFRA 6개에서 운영진·멤버 14개 역할로.
-- authorPart를 단일 문자열에서 JSON 배열(TEXT)로 변경한다.
-- SQLite는 기존 CHECK 제약 수정·DROP COLUMN을 ALTER TABLE로 할 수 없으므로 테이블 재생성.

create table member_roles_new (
    member_id bigint not null,
    role varchar(255) check (role in (
        'PRESIDENT','VICE_PRESIDENT',
        'BACKEND_LEAD','FRONTEND_LEAD','DESIGN_LEAD','AI_LEAD',
        'PLANNING_HEAD','PLANNING_MEMBER',
        'PR_HEAD','PR_MEMBER',
        'BACKEND','FRONTEND','DESIGN','AI'
    ))
);

insert into member_roles_new (member_id, role)
select member_id, role from member_roles;

drop table member_roles;

alter table member_roles_new rename to member_roles;

create table project_participants_new (
    id integer,
    member_id bigint not null,
    project_id bigint not null,
    part varchar(255) not null check (part in (
        'PRESIDENT','VICE_PRESIDENT',
        'BACKEND_LEAD','FRONTEND_LEAD','DESIGN_LEAD','AI_LEAD',
        'PLANNING_HEAD','PLANNING_MEMBER',
        'PR_HEAD','PR_MEMBER',
        'BACKEND','FRONTEND','DESIGN','AI'
    )),
    primary key (id)
);

insert into project_participants_new (id, member_id, project_id, part)
select id, member_id, project_id, part from project_participants;

drop table project_participants;

alter table project_participants_new rename to project_participants;

create table posts_new (
    id            integer      not null primary key autoincrement,
    slug          varchar(255) not null unique,
    title         varchar(255) not null,
    content       TEXT         not null,
    author_name   varchar(255) not null,
    author_part_json TEXT,
    status        varchar(255) not null,
    summary       TEXT,
    thumbnail_url varchar(255),
    published_at  varchar(255),
    created_at    varchar(255) not null,
    updated_at    varchar(255) not null
);

insert into posts_new (id, slug, title, content, author_name, author_part_json,
                       status, summary, thumbnail_url, published_at, created_at, updated_at)
select id, slug, title, content, author_name,
       case when author_part is null or author_part = ''
            then '[]'
            else json_array(author_part)
       end,
       status, summary, thumbnail_url, published_at, created_at, updated_at
from posts;

drop table posts;

alter table posts_new rename to posts;
