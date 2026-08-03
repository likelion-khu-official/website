-- #383 배포 전에 경로만 저장된 프로젝트 상세 조회를 불변 프로젝트 ID로 연결한다.
update analytics_page_views
set content_type = 'PROJECT',
    content_id = cast(substr(path, 11) as integer)
where path like '/projects/%'
  and instr(substr(path, 11), '/') = 0
  and exists (
      select 1 from projects p where p.id = cast(substr(analytics_page_views.path, 11) as integer)
  );
