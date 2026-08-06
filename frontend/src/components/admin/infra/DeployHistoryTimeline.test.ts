import { describe, expect, it } from 'vitest';
import { actionGuidance, findIncidents, inSync, severityOf, toChronological } from './DeployHistoryTimeline';
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

describe('actionGuidance — 과정이 아니라 "지금 뭘 해야 하는가" 한 문장', () => {
  it('정상 배포 + DB 일치는 할 일이 없다', () => {
    expect(actionGuidance(record({ outcome: 'confirmed' }))).toBeNull();
  });

  it('outcome이 confirmed여도 DB가 어긋나면 확인하라는 안내가 뜬다', () => {
    const drifted = record({ outcome: 'confirmed', expectedMigrationCount: 30, actualMigrationCount: 29 });
    expect(actionGuidance(drifted)).not.toBeNull();
  });

  it('rolled_back은 원인만 고쳐 재배포하면 된다고 안내한다', () => {
    expect(actionGuidance(record({ outcome: 'rolled_back' }))).toContain('다시 배포');
  });

  it('rollback_failed는 즉시 RUNBOOK을 보라고 안내한다', () => {
    expect(actionGuidance(record({ outcome: 'rollback_failed' }))).toContain('RUNBOOK');
  });

  it('manual_intervention_needed는 fix-forward부터 검토하라고 안내한다', () => {
    expect(actionGuidance(record({ outcome: 'manual_intervention_needed' }))).toContain('fix-forward');
  });

  it('build_failed는 로그 보고 다시 배포하라고 안내한다', () => {
    expect(actionGuidance(record({ outcome: 'build_failed' }))).toContain('로그');
  });

  it('outcome마다 서로 다른 안내를 준다 — 뭉뚱그리지 않는다', () => {
    const outcomes: DeployRecord['outcome'][] = [
      'rolled_back',
      'rollback_failed',
      'manual_intervention_needed',
      'migration_check_blocked',
      'build_failed',
      'unknown',
    ];
    const guidances = outcomes.map((outcome) => actionGuidance(record({ outcome })));
    expect(new Set(guidances).size).toBe(outcomes.length);
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
