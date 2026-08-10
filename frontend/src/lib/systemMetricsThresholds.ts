// infra/docs/observability.md의 실제 OCI Monitoring 알람 임계치(디스크 80%·메모리 85%).
// SystemMetricsChart(기준선)와 SystemMetricsPanel(스탯 타일 강조) 둘 다 같은 값을 써야
// 알람 임계치가 바뀌었을 때 한 곳만 고치면 되게 여기로 모았다. CPU는 알람이 없어 없음.
export const MEMORY_ALARM_THRESHOLD = 85;
export const DISK_ALARM_THRESHOLD = 80;
