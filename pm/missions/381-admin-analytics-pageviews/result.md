# 결과

관리자가 `/admin/analytics`에서 최근 30일을 기본으로 전체 조회 추이와 많이 본 페이지를 확인할 수 있게 했다. 최근 7·30·90일 또는 직접 날짜를 고르고 일·주·월로 묶어 볼 수 있으며, 페이지를 선택하면 그 페이지의 추이로 바뀐다. 기간·간격·페이지는 URL에 남는다.

## 실제로 쌓인다는 증거

- 공개 페이지 조회 3회를 HTTP로 전송 → `analytics_page_views` 3행 저장 → 같은 기간 관리자 API 합계 3회
- `/projects` 2회와 `/blog` 1회 → 페이지 표도 각각 2회·1회
- 기간 밖 조회는 0, 운영 외 호스트·`/admin`·봇 요청은 응답을 방해하지 않으면서 DB에는 0행
- KST 기준 일·월요일 시작 주·월 경계와 조회 없는 구간 0 채움 검증

위 흐름은 `AnalyticsPageViewIntegrationTest` 하나에서 실제 Spring HTTP 경계와 SQLite 저장소를 통과한다. 화면 캡처의 수치는 시각 회귀를 일정하게 만들기 위한 더미 데이터이며 실제 저장 증거와 섞지 않았다.

## 화면 QA

- 데스크톱 전체 화면: `evidence/desktop-overview.png`
- Grafana식 날짜 교차선·hover tooltip: `evidence/desktop-hover-tooltip.png`
- 390px 모바일 전체 화면: `evidence/mobile-overview.png`
- 첫 모바일 QA에서 표의 조회수 열이 가려진 문제를 발견해, 모바일에서는 페이지명 아래 경로를 묶고 조회수를 항상 오른쪽에 보이게 수정했다.

## 자동 검증

- FE: 24개 파일, 85개 테스트 통과
- FE lint·Next 프로덕션 build 통과 (`/admin/analytics` 정적 경로 생성 확인)
- 브라우저: 데스크톱·hover·390px 모바일 2개 시나리오 통과
- BE unit shard 통과
- 분석 HTTP→DB→집계 및 실제 Flyway→Hibernate 스키마 일치 통합 테스트 통과
- BE 전체 387개 중 Docker가 필요한 기존 Mailpit 통합 테스트 8개만 실행 환경의 Docker 부재로 초기화 실패

## 보안·운영 경계

IP, 이메일, 학번, 사용자 입력, URL 쿼리를 저장하지 않는다. 운영 공개 도메인만 허용하고 관리자·부원·API 경로, 개발·스테이지, 알려진 봇을 서버에서 제외한다. 새 ECharts 의존성 자체에는 감사 경고가 없었지만, 기존 Next.js 16.2.9에서 npm audit의 high 경고 3건이 확인되어 이 PR 범위에서는 건드리지 않았다.

