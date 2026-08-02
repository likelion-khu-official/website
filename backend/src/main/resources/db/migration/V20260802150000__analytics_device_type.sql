-- 원본 User-Agent나 세부 기기명은 저장하지 않고 세 분류만 페이지 조회에 남긴다.
alter table analytics_page_views
    add column device_type varchar(16) not null default 'OTHER';

create index idx_analytics_page_views_device_occurred_at
    on analytics_page_views (device_type, occurred_at);
