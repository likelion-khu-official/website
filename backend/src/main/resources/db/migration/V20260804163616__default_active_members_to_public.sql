-- 어드민 멤버 등록 화면은 게재 동의 값을 보내지 않았고, 서버가 누락값을 false로 저장해
-- 등록 성공 뒤에도 공개 /members 목록이 비는 문제가 있었다. PM 결정에 따라 활성 멤버의
-- 기본값을 공개로 전환하고, 기존 활성 행은 이 정책이 적용된 시각을 동의 증적으로 남긴다.
-- 오프보딩된 과거 기록은 다시 공개하지 않는다.

update members
set publication_consent = true,
    publication_consented_at = cast(cast(strftime('%s', 'now') as integer) * 1000 as text)
where publication_consent = false
  and publication_consented_at is null
  and offboarded_at is null;
