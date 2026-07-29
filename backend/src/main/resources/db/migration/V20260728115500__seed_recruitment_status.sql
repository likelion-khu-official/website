-- 모집 상태 싱글턴 행을 미리 만들어 둔다(#151 코드리뷰). 공개(비인증) GET /api/recruitment/status가
-- 생기면서, RecruitmentManagementService.findOrCreate()의 "없으면 생성" 분기를 이제 인증 없는
-- 요청도 탈 수 있게 됐다 — 행을 미리 채워두면 그 분기 자체가 항상 스킵된다.
-- INSERT OR IGNORE: stage/prod는 #124/#126 배포 이후 관리자가 이미 모집을 켜거나 껐을 수 있어
-- 이 행이 이미 있을 수 있다 — 있으면 그대로 두고, 없을 때만 채운다.
insert or ignore into recruitment_status (id, open, opened_at) values (1, false, null);
