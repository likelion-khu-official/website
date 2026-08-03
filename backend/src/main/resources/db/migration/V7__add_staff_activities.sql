-- 운영진 소개 카드의 "활동 이력". 한 운영진이 활동 여러 개를 가지는 리스트라
-- member_roles와 같은 @ElementCollection 컬렉션 테이블로 둔다.
-- 순서(sort_order)는 JPA @OrderColumn이 관리한다 — 화면에 보이는 활동 순서를 고정하기 위함.
create table staff_activities (
    staff_id bigint not null,
    activity varchar(255) not null,
    sort_order integer not null,
    primary key (staff_id, sort_order)
);
