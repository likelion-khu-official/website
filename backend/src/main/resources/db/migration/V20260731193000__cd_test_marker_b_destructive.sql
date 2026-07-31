-- #320 CD 검증용 임시 마이그레이션 — 절대 dev/main에 merge하지 않는다.
-- 삭제/변경형(테이블 재생성 패턴) — 자동 롤백 "생략" 판정 시나리오 검증용.
-- cd_test_marker는 이전 시나리오가 만든 더미 테이블이라 실제 데이터에 영향 없음.
create table cd_test_marker_new (
    id integer primary key
);

insert into cd_test_marker_new select id from cd_test_marker;

drop table cd_test_marker;

alter table cd_test_marker_new rename to cd_test_marker;
