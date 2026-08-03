-- #320 CD 검증용 임시 마이그레이션 — 절대 dev/main에 merge하지 않는다.
-- drop/rename 키워드 없는 순수 DML(UPDATE) — 방금 넓힌 판정 정규식이 이걸
-- destructive=true로 잡는지(백업 실행 + 자동 롤백 생략) 검증용.
create table cd_test_dml_marker (
    id integer primary key,
    value varchar(50)
);

insert into cd_test_dml_marker (id, value) values (1, 'before');

update cd_test_dml_marker set value = 'after' where id = 1;
