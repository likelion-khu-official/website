// 알람 상태 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
//
// infra/scripts/snapshot-alarm-status.py가 5분마다 OCI Monitoring의 list_alarms_status
// 결과(FIRING/OK 판정 그 자체)를 로컬 JSON Lines에 남기고, 백엔드는 최신 한 줄만 조회한다 —
// 시스템 지표(system-metrics.ts)와 같은 파일 마운트 패턴이지만, 알람 상태는 시계열이 아니라
// "지금 상태" 스냅샷 하나만 의미가 있어 배열이 아닌 단일 객체다.

export type AlarmSeverity = 'CRITICAL' | 'WARNING';
export type AlarmState = 'FIRING' | 'OK';

export interface AlarmStatusItem {
  alarmName: string;
  severity: AlarmSeverity;
  status: AlarmState;
}

export interface AlarmStatusSnapshot {
  timestamp: string; // ISO 8601 UTC — 이 상태를 OCI에서 조회한 시각
  alarms: AlarmStatusItem[];
}
