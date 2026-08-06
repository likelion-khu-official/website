// 배포 이력 계약 — FE↔BE 합의 파일 (#451 인프라 대시보드)
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
//
// CD(.github/workflows/cd.yml, record-deploy-status job)가 배포마다 남기는 기록을 그대로
// 내려주는 조회 전용 API의 응답 모양. expectedMigrationCount(이 배포된 앱 버전이 기대하는
// 마이그레이션 개수)와 actualMigrationCount(DB에 실제 적용된 개수)가 다르면 앱-DB가 어긋난
// 상태 — 예: 배포 실패로 앱은 롤백됐지만 마이그레이션은 이미 적용되어 그대로 남은 경우.

export type DeployOutcome =
  | 'confirmed' // 배포 성공, 확정됨
  | 'rolled_back' // 배포 실패 → 자동 롤백 성공(추가형 마이그레이션만 이 경로)
  | 'rollback_failed' // 롤백까지 실패 — 즉시 수동 개입 필요
  | 'manual_intervention_needed' // 삭제/변경형 마이그레이션 포함 배포 실패 — 자동 롤백 생략, 사람이 판단
  | 'migration_check_blocked' // 이미 적용된 마이그레이션 파일이 삭제·수정돼 배포 자체가 막힘
  | 'build_failed' // 이미지 빌드 단계에서 실패
  | 'unknown';

export type MigrationRisk = 'additive' | 'destructive';

export interface DeployMigrationEntry {
  file: string;
  type: MigrationRisk;
}

export interface DeployRecord {
  timestamp: string; // ISO 8601 UTC
  env: 'stage' | 'prod';
  sha: string;
  outcome: DeployOutcome;
  migrations: DeployMigrationEntry[];
  expectedMigrationCount: number;
  actualMigrationCount: number;
}
