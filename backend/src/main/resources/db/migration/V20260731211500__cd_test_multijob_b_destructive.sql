-- #320 다중 job 리팩터링 재검증용 — 절대 dev/main에 merge하지 않는다.
-- 삭제/변경형(재생성 패턴) — manual-intervention job이 새 다중 job 구조에서도
-- 정상 트리거되고 rollback job은 skip되는지 검증.
create table cd_test_multijob_marker_new (
    id integer primary key
);

insert into cd_test_multijob_marker_new select id from cd_test_multijob_marker;

drop table cd_test_multijob_marker;

alter table cd_test_multijob_marker_new rename to cd_test_multijob_marker;
