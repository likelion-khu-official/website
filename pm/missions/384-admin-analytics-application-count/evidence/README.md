# 지원 수 카드 QA 증거

- `desktop-closed-recruitment.png`: 모집 종료 뒤에도 최근 모집의 최종 지원 수와 기간이 유지되는 카드
- `mobile-closed-recruitment.png`: 390px 화면에서 같은 카드가 가로 스크롤 없이 읽히는지 확인

Playwright는 최근 7일 트래픽 조건과 별개로 종료된 모집의 지원 수 128건을 주입해 카드가 기간 필터에 종속되지 않음을 재현한다.
