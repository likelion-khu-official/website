-- #320 CD 검증 시나리오 A~D가 남긴 더미 테이블 정리.
-- 검증 자체는 끝났고, 실제 엔티티와 무관한 테스트 전용 테이블이라 stage의 다른 데이터에는 영향 없음.
drop table if exists cd_test_marker;
