-- #320 다중 job 리팩터링 재검증용 — 절대 dev/main에 merge하지 않는다.
-- 순수 추가형 — rollback job이 새 다중 job 구조에서도 정상 실행되는지 검증.
create table cd_test_multijob_marker (
    id integer primary key
);
