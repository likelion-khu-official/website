-- #320 CD 검증용 임시 마이그레이션 — 절대 dev/main에 merge하지 않는다.
-- 순수 추가형(ADD COLUMN) — 위험도 판단 스텝이 정상 배포 경로를 방해하지 않는지 검증용.
alter table cd_test_marker add column label varchar(255);
