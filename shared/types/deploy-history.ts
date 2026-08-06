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
  // DB에 실제로 마지막까지 적용된 마이그레이션 파일명(예: "V20260806100345__xxx.sql").
  // flyway_schema_history에 성공 행이 하나도 없으면(첫 배포 전 등) null. 개수(actualMigrationCount)만
  // 으론 "몇 개"만 답하고 "어느 파일까지"는 못 답해서 추가함(#457 리뷰). optional인 이유: 이 필드가
  // 생기기 전에 이미 기록된 옛 줄에는 없다 — 화면은 없으면 그냥 개수만 보여줘야 한다.
  latestAppliedMigration?: string | null;
  // CD가 헬스체크·스모크테스트 실패 시점에 컨테이너 로그/응답 코드를 분류해서 좁힌 원인 한 문장
  // (infra/scripts/classify-deploy-failure.sh). "빌드는 성공했으니 A거나 B일 수 있어요" 같은
  // 일반론 대신, 그 배포에서 CD가 실제로 관찰한 신호 기준의 구체적 문장 — 정상 배포처럼 애초에
  // 헬스체크·스모크테스트까지 안 간 outcome이거나, 이 필드가 생기기 전 기록이면 null.
  probableCause?: string | null;
}
