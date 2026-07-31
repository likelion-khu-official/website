-- #320 CD 검증용 임시 마이그레이션 — 절대 dev/main에 merge하지 않는다.
-- 순수 추가형(신규 테이블 하나) — 자동 롤백 "안전" 판정 시나리오 검증용.
create table cd_test_marker (
    id integer primary key,
    note varchar(255)
);
