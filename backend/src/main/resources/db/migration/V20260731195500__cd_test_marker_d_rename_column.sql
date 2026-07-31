-- #320 CD 검증용 임시 마이그레이션 — 절대 dev/main에 merge하지 않는다.
-- 삭제/변경형(RENAME COLUMN) — 배포 전 자동 백업이 정상 배포를 막지 않는지 검증용.
-- 시나리오B와 다른 패턴(재생성 대신 RENAME COLUMN)으로 판정 정규식의 다른 분기를 검사.
alter table cd_test_marker rename column label to note;
