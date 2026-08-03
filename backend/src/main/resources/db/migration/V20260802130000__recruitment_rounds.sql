-- 지원 수를 조회 기간이 아니라 모집 한 번의 수명주기에 묶는다.
create table recruitment_rounds (
    id integer,
    opened_at varchar(255) not null,
    closed_at varchar(255),
    primary key (id)
);

alter table recruitment_status add column current_round_id bigint;
alter table applications add column recruitment_round_id bigint;

-- 이전 버전에는 모집기 개념이 없었다. 현재 모집이 열려 있다면 opened_at 전 지원서는
-- 복구 가능한 이전 모집기로 먼저 묶는다. 그래야 배포 시 현재 모집 지원 수가 부풀지 않는다.
insert into recruitment_rounds (opened_at, closed_at)
select min(a.submitted_at), max(a.submitted_at)
from recruitment_status rs
join applications a on a.submitted_at < rs.opened_at
where rs.id = 1 and rs.open
having count(a.id) > 0;

-- 열려 있는 모집은 지원서가 0건이어도 현재 모집기로 남긴다.
insert into recruitment_rounds (opened_at, closed_at)
select coalesce(rs.opened_at, datetime('now')), null
from recruitment_status rs
where rs.id = 1 and rs.open;

-- 닫힌 상태에서는 남아 있는 지원서를 복구 가능한 가장 최근 모집 하나로 묶는다.
insert into recruitment_rounds (opened_at, closed_at)
select coalesce(rs.opened_at, min(a.submitted_at), datetime('now')),
       coalesce(max(a.submitted_at), rs.opened_at, datetime('now'))
from recruitment_status rs
left join applications a on 1 = 1
where rs.id = 1 and not rs.open
group by rs.id, rs.opened_at
having rs.opened_at is not null or count(a.id) > 0;

update recruitment_status
set current_round_id = (select max(id) from recruitment_rounds)
where id = 1;

update applications
set recruitment_round_id = case
    when (select open from recruitment_status where id = 1)
         and submitted_at < (select opened_at from recruitment_status where id = 1)
        then (select min(id) from recruitment_rounds)
    else (select max(id) from recruitment_rounds)
end
where recruitment_round_id is null;

create index idx_applications_recruitment_round
    on applications (recruitment_round_id);
