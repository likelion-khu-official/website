-- #320 CD 검증용 임시 마이그레이션 — 절대 dev/main에 merge하지 않는다.
-- drop/rename/update/delete 키워드 없는 INSERT OR REPLACE — 방금 추가한 판정
-- 정규식이 이걸 destructive=true로 잡는지(백업 실행 + 자동 롤백 생략) 검증용.
create table cd_test_replace_marker (
    id integer primary key,
    value varchar(50)
);

insert into cd_test_replace_marker (id, value) values (1, 'before');

-- id=1 충돌 → 기존 행을 지우고 새로 넣는다(사실상 DELETE+INSERT).
insert or replace into cd_test_replace_marker (id, value) values (1, 'after');
