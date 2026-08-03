-- #320 CD 검증 시나리오 E가 남긴 더미 테이블 정리.
-- drop table 키워드가 있어 이 파일 자체도 destructive=true로 잡힌다(의도된 정상 동작).
drop table if exists cd_test_dml_marker;
