-- #381: 공개 운영 사이트의 페이지 조회만 익명으로 저장한다.
-- URL 쿼리·IP·사용자 식별자는 저장하지 않아 이 테이블만으로 방문자를 재식별할 수 없다.
create table analytics_page_views (
    id integer,
    occurred_at varchar(255) not null,
    path varchar(512) not null,
    primary key (id)
);

create index idx_analytics_page_views_occurred_at
    on analytics_page_views (occurred_at);

create index idx_analytics_page_views_path_occurred_at
    on analytics_page_views (path, occurred_at);

