// 시스템 지표 계약 — FE↔BE 합의 파일 (#451 인프라 대시보드)
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
//
// infra/scripts/snapshot-system-metrics.py가 호스트에서 5분마다 CPU/메모리/디스크
// 사용률을 직접 읽어 로컬 JSON Lines에 남기고, 백엔드는 그 파일을 조회만 하는 구조 —
// 배포 이력과 같은 패턴. 인스턴스가 하나뿐이라(stage/prod 컨테이너가 같은 호스트를
// 공유) env 구분 없이 인스턴스 하나의 시계열만 있다.

export interface SystemMetricSample {
  timestamp: string; // ISO 8601 UTC
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
}
