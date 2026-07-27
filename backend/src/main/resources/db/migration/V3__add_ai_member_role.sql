-- 14기 실제 조직의 AI 세션을 멤버 로스터와 프로젝트 참여 역할에 정식 추가한다.
--
-- SQLite는 기존 CHECK 제약을 ALTER TABLE로 수정할 수 없으므로, AI가 들어가는 두 테이블을
-- 새 제약으로 재생성해 기존 데이터를 그대로 옮긴다. V1/V2는 이미 적용된 환경의 Flyway
-- 체크섬을 지키기 위해 수정하지 않는다.

create table member_roles_new (
    member_id bigint not null,
    role varchar(255) check (role in ('PM','FE','BE','DESIGN','AI','INFRA'))
);

insert into member_roles_new (member_id, role)
select member_id, role
from member_roles;

drop table member_roles;

alter table member_roles_new rename to member_roles;

create table project_participants_new (
    id integer,
    member_id bigint not null,
    project_id bigint not null,
    part varchar(255) not null check (part in ('PM','FE','BE','DESIGN','AI','INFRA')),
    primary key (id)
);

insert into project_participants_new (id, member_id, project_id, part)
select id, member_id, project_id, part
from project_participants;

drop table project_participants;

alter table project_participants_new rename to project_participants;
