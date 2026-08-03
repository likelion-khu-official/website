-- #145: 부원 오프보딩(소프트 딜리트) 지원 + 학번 unique를 (학번, 기수) 복합키로 정정.
--
-- 오프보딩은 로그인만 막고 row는 남기는 소프트 딜리트인데, 기존 student_id 단일 unique 때문에
-- 오프보딩된 학번은 영원히 재사용(재입부)할 수 없었다(#155 PR 리뷰에서 발견). SQLite는
-- ALTER TABLE로 기존 컬럼의 제약을 못 바꿔서(단일 unique 제거·복합 unique 추가 모두 불가) 테이블을
-- 새로 만들어 데이터를 옮기는 방식으로 처리한다. member_roles.member_id는 FK 제약이 없어(V1
-- baseline 참고) 이 테이블 재생성이 다른 테이블에 영향을 주지 않는다.

create table members_new (
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
    offboarded_at varchar(255),
    password_hash varchar(255) not null,
    phone varchar(255) not null,
    photo_url varchar(255),
    student_id varchar(255) not null,
    updated_at varchar(255) not null,
    updated_by varchar(255) not null,
    primary key (id),
    unique (student_id, cohort)
);

insert into members_new (
    cohort, failed_login_attempts, must_change_password, id, created_at, created_by,
    emoji, join_reason, locked_until, name, offboarded_at, password_hash, phone,
    photo_url, student_id, updated_at, updated_by
)
select
    cohort, failed_login_attempts, must_change_password, id, created_at, created_by,
    emoji, join_reason, locked_until, name, null, password_hash, phone,
    photo_url, student_id, updated_at, updated_by
from members;

drop table members;

alter table members_new rename to members;
