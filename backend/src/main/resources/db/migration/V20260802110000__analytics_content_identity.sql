-- #382: 경로가 바뀌어도 같은 콘텐츠의 과거 조회를 잇기 위한 불변 콘텐츠 ID.
-- 일반 페이지 조회에는 둘 다 null이라 #381의 의미와 집계를 그대로 유지한다.
alter table analytics_page_views add column content_type varchar(32)
    check (content_type in ('BLOG_POST', 'PROJECT'));
alter table analytics_page_views add column content_id bigint;

-- #382 배포 전에 쌓인 블로그 경로도 현재 slug로 연결한다.
update analytics_page_views
set content_type = 'BLOG_POST',
    content_id = (
        select p.id from posts p where '/blog/' || p.slug = analytics_page_views.path
    )
where path like '/blog/%'
  and exists (
      select 1 from posts p where '/blog/' || p.slug = analytics_page_views.path
  );

create index idx_analytics_page_views_content_occurred_at
    on analytics_page_views (content_type, content_id, occurred_at);

