-- 공동저자는 공개 바이라인에만 쓰는 표시 정보다.
-- 글 소유권과 수정·삭제 권한은 기존 author_member_id 한 개로 계속 판정한다.
alter table posts add column coauthors_json TEXT not null default '[]';
