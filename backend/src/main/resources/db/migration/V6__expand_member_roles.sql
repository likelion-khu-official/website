-- MemberRole 확장: PM/FE/BE/DESIGN/AI/INFRA 6개에서 운영진·멤버 14개 역할로.
-- authorPart를 단일 문자열에서 JSON 배열(TEXT)로 변경한다.
-- SQLite는 기존 CHECK 제약 수정·DROP COLUMN을 ALTER TABLE로 할 수 없으므로 테이블 재생성.
--
-- 기존 데이터 매핑 정책:
--   BE    → BACKEND   | FE → FRONTEND | DESIGN → DESIGN | AI → AI (그대로)
--   PM    → 행 삭제   | INFRA → 행 삭제  (해당 역할 자체가 폐지됨)

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

-- 구 역할을 새 이름으로 매핑. PM·INFRA는 폐지 → 행 삭제.
insert into member_roles_new (member_id, role)
select member_id,
       case role
           when 'BE'     then 'BACKEND'
           when 'FE'     then 'FRONTEND'
           when 'DESIGN' then 'DESIGN'
           when 'AI'     then 'AI'
           else role
       end
from member_roles
where role not in ('PM', 'INFRA');

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

-- project_participants도 동일 매핑. PM·INFRA 참가자는 행 삭제.
insert into project_participants_new (id, member_id, project_id, part)
select id, member_id, project_id,
       case part
           when 'BE'     then 'BACKEND'
           when 'FE'     then 'FRONTEND'
           when 'DESIGN' then 'DESIGN'
           when 'AI'     then 'AI'
           else part
       end
from project_participants
where part not in ('PM', 'INFRA');

drop table project_participants;

alter table project_participants_new rename to project_participants;

create table posts_new (
    id               integer      not null primary key autoincrement,
    slug             varchar(255) not null unique,
    title            varchar(255) not null,
    content          TEXT         not null,
    author_name      varchar(255) not null,
    author_part_json TEXT,
    author_member_id bigint,
    status           varchar(255) not null,
    summary          TEXT,
    thumbnail_url    varchar(255),
    published_at     varchar(255),
    created_at       varchar(255) not null,
    updated_at       varchar(255) not null
);

-- author_part(단일 문자열)를 author_part_json(JSON 배열)으로 변환.
-- 구 역할 값도 함께 매핑: BE→BACKEND, FE→FRONTEND. PM·INFRA는 빈 배열로.
insert into posts_new (id, slug, title, content, author_name, author_part_json, author_member_id,
                       status, summary, thumbnail_url, published_at, created_at, updated_at)
select id, slug, title, content, author_name,
       case author_part
           when 'BE'     then '["BACKEND"]'
           when 'FE'     then '["FRONTEND"]'
           when 'DESIGN' then '["DESIGN"]'
           when 'AI'     then '["AI"]'
           when 'PM'     then '[]'
           when 'INFRA'  then '[]'
           else case when author_part is null or author_part = ''
                     then '[]'
                     else json_array(author_part)
                end
       end,
       author_member_id,
       status, summary, thumbnail_url, published_at, created_at, updated_at
from posts;

drop table posts;

alter table posts_new rename to posts;
