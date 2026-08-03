# QA 증거

이 폴더의 화면 이미지는 `frontend/playwright.analytics.config.ts`와 분석 화면 전용 브라우저 테스트로 다시 만들 수 있다. 화면 데이터는 레이아웃·툴팁을 같은 조건에서 비교하기 위한 명시적 더미이며, 실제 저장·집계 증거는 백엔드 `AnalyticsPageViewIntegrationTest`가 HTTP 요청부터 DB 행과 관리자 응답까지 검증한다.

