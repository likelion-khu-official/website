# 결과

관리자가 선택 기간에 DB에 실제로 새로 저장된 모집 알림 신청 합계와 날짜별 추이를 확인할 수 있게 했다. 주요 클릭 바로 다음에 배치하고 성공 기준을 문장으로 밝혀 클릭 수와 혼동하지 않게 했다.

## 실제 HTTP와 DB로 확인한 신청

- `first@example.com` 신규 신청 후 같은 이메일 반복 신청 → DB 1건
- `second@example.com` 신규 신청 → DB 총 2건
- 봇 함정이 채워진 요청 → 사용자 응답은 동일하지만 DB 증가 없음
- 오늘 분석 합계·그래프 2건 = 기존 구독 DB 2건
- 이전 이틀 분석은 0건
- 분석 JSON에 두 이메일 주소가 포함되지 않음

## 화면 QA

- 데스크톱 합계·그래프 hover: `evidence/desktop-signups-hover.png`
- 390px 모바일 합계·그래프: `evidence/mobile-signups.png`

## 자동 검증

- FE 관리자 합계·설명·그래프 테스트 통과
- BE 실제 공개 구독 HTTP·중복·봇·DB·기간·비노출·인증 통합 테스트 통과
- FE 전체 테스트·lint·프로덕션 build 통과
- BE unit shard 통과
- Playwright 데스크톱 hover·390px 모바일 통과
