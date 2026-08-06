import { describe, expect, it } from 'vitest';
import { deriveStages, findIncidents, inSync, severityOf, toChronological } from './DeployHistoryTimeline';
import type { DeployRecord } from '@shared/types/deploy-history';

function record(overrides: Partial<DeployRecord>): DeployRecord {
  return {
    timestamp: '2026-08-06T04:00:00Z',
    env: 'stage',
    sha: '0123456789abcdef',
    outcome: 'confirmed',
    migrations: [],
    expectedMigrationCount: 29,
    actualMigrationCount: 29,
    ...overrides,
  };
}

describe('toChronological', () => {
  it('최신이 먼저 오는 API 순서를 과거→최신으로 뒤집는다', () => {
    const result = toChronological([
      record({ timestamp: '2026-08-06T04:00:00Z', sha: 'newest' }),
      record({ timestamp: '2026-08-01T01:00:00Z', sha: 'oldest' }),
    ]);
    expect(result.map((r) => r.sha)).toEqual(['oldest', 'newest']);
  });
});

describe('severityOf', () => {
  it('정상 배포 + DB 일치는 ok', () => {
    expect(severityOf(record({ outcome: 'confirmed' }))).toBe('ok');
  });

  it('배포는 실패했지만 DB는 안전하면(빌드 실패 등) warn — 위험도가 다르다', () => {
    expect(severityOf(record({ outcome: 'build_failed' }))).toBe('warn');
    expect(severityOf(record({ outcome: 'rolled_back' }))).toBe('warn');
    expect(severityOf(record({ outcome: 'migration_check_blocked' }))).toBe('warn');
  });

  it('롤백 실패·수동 개입처럼 DB가 실제로 위험할 수 있는 outcome은 critical', () => {
    expect(severityOf(record({ outcome: 'rollback_failed' }))).toBe('critical');
    expect(severityOf(record({ outcome: 'manual_intervention_needed' }))).toBe('critical');
  });

  it('outcome이 confirmed여도 DB 마이그레이션 개수가 어긋나면 critical로 격상된다', () => {
    const drifted = record({ outcome: 'confirmed', expectedMigrationCount: 30, actualMigrationCount: 29 });
    expect(inSync(drifted)).toBe(false);
    expect(severityOf(drifted)).toBe('critical');
  });

  it('unknown outcome은 unknown', () => {
    expect(severityOf(record({ outcome: 'unknown' }))).toBe('unknown');
  });
});

describe('deriveStages — cd.yml의 job DAG를 outcome에서 되짚는다', () => {
  it('confirmed는 모든 단계가 ok', () => {
    const stages = deriveStages(record({ outcome: 'confirmed' }));
    expect(stages.every((stage) => stage.status === 'ok')).toBe(true);
  });

  it('build_failed는 빌드에서 실패하고 그 뒤(배포·검증, 사후처리)는 건너뛴다 — deploy job이 build에 의존하므로', () => {
    const stages = deriveStages(record({ outcome: 'build_failed' }));
    const byLabel = Object.fromEntries(stages.map((s) => [s.label, s.status]));
    expect(byLabel['빌드']).toBe('fail');
    expect(byLabel['배포·검증']).toBe('skip');
    expect(byLabel['사후처리']).toBe('skip');
    expect(byLabel['기록']).toBe('ok'); // record-deploy-status는 always()라 항상 실행됨
  });

  it('migration_check_blocked는 build job의 실제 성공 여부를 알 수 없다 — deploy가 migration-check·build 둘 다에 독립적으로 의존하므로 build가 성공했다고 단정하지 않는다', () => {
    const stages = deriveStages(record({ outcome: 'migration_check_blocked' }));
    const byLabel = Object.fromEntries(stages.map((s) => [s.label, s.status]));
    expect(byLabel['마이그레이션 점검']).toBe('fail');
    expect(byLabel['빌드']).toBe('unknown');
    expect(byLabel['배포·검증']).toBe('skip');
  });

  it('manual_intervention_needed는 destructive=unknown(수동 배포 등)일 때 실제로 위험 파일을 찾았다고 단정하지 않는다', () => {
    const stages = deriveStages(record({ outcome: 'manual_intervention_needed', migrations: [] }));
    const migrationCheck = stages.find((s) => s.label === '마이그레이션 점검');
    expect(migrationCheck?.note).toContain('판단 불가');

    const withDestructive = deriveStages(
      record({ outcome: 'manual_intervention_needed', migrations: [{ file: 'V1__x.sql', type: 'destructive' }] })
    );
    expect(withDestructive.find((s) => s.label === '마이그레이션 점검')?.note).toContain('삭제·변경형 마이그레이션 포함');
  });

  it('rollback_failed는 배포·검증 실패 뒤 자동 롤백 자체도 실패한 것으로 표시한다', () => {
    const stages = deriveStages(record({ outcome: 'rollback_failed' }));
    const byLabel = Object.fromEntries(stages.map((s) => [s.label, s.status]));
    expect(byLabel['배포·검증']).toBe('fail');
    expect(byLabel['자동 롤백']).toBe('fail');
  });
});

describe('findIncidents — 연속으로 DB가 어긋난 구간을 하나로 묶는다', () => {
  it('정합성이 깨진 연속 구간을 하나의 사고로 묶는다', () => {
    const chronological = [
      record({ timestamp: '2026-08-01T00:00:00Z', expectedMigrationCount: 1, actualMigrationCount: 1 }),
      record({ timestamp: '2026-08-02T00:00:00Z', expectedMigrationCount: 2, actualMigrationCount: 1 }), // 사고 시작
      record({ timestamp: '2026-08-03T00:00:00Z', expectedMigrationCount: 2, actualMigrationCount: 1 }), // 사고 지속
      record({ timestamp: '2026-08-04T00:00:00Z', expectedMigrationCount: 2, actualMigrationCount: 2 }), // 정상화
    ];
    const incidents = findIncidents(chronological);
    expect(incidents).toEqual([{ startIndex: 1, endIndex: 2 }]);
  });

  it('정합성이 안 깨지면 사고가 없다', () => {
    const chronological = [record({}), record({})];
    expect(findIncidents(chronological)).toEqual([]);
  });

  it('아직 정상화 안 된 사고는 마지막 인덱스까지로 끝난다', () => {
    const chronological = [
      record({ expectedMigrationCount: 1, actualMigrationCount: 1 }),
      record({ expectedMigrationCount: 2, actualMigrationCount: 1 }),
    ];
    expect(findIncidents(chronological)).toEqual([{ startIndex: 1, endIndex: 1 }]);
  });
});
