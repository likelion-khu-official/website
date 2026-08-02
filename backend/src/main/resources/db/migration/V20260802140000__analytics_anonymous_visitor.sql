-- 브라우저가 만든 무작위 UUID의 SHA-256만 저장한다. 원본 UUID·IP·이메일·계정 ID는 저장하지 않는다.
alter table analytics_page_views add column visitor_key varchar(64);

create index idx_analytics_page_views_visitor_occurred_at
    on analytics_page_views (visitor_key, occurred_at);
