import { describe, expect, it } from 'vitest';
import { buildDeployTrackOption } from './DeployHistoryTrackChart';
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

interface BarDatum { value: number; itemStyle: { color: string }; label: { show: boolean } }
type BarSeries = { type: string; data: BarDatum[] };

describe('buildDeployTrackOption', () => {
  it('두 트랙이 같은 칸이면 나란히 같은 색으로 표시하고 뒤처짐 라벨이 없다', () => {
    const option = buildDeployTrackOption([record({})], true) as { series: BarSeries[] };
    const bar = option.series.find((series) => series.type === 'bar')!;
    const [dbDatum, appDatum] = bar.data;

    expect(dbDatum.value).toBe(29);
    expect(appDatum.value).toBe(29);
    expect(dbDatum.itemStyle.color).toBe('#60a5fa');
    expect(appDatum.itemStyle.color).toBe('#ff6b2c');
    expect(dbDatum.label.show).toBe(false);
    expect(appDatum.label.show).toBe(false);
  });

  it('DB 마이그레이션이 못 따라가면 DB 트랙만 뒤처진 칸수만큼 짧고 빨갛게 표시된다', () => {
    const option = buildDeployTrackOption(
      [record({ expectedMigrationCount: 32, actualMigrationCount: 29 })],
      true
    ) as { series: BarSeries[] };
    const bar = option.series.find((series) => series.type === 'bar')!;
    const [dbDatum, appDatum] = bar.data;

    expect(dbDatum.value).toBe(29);
    expect(appDatum.value).toBe(32);
    expect(dbDatum.itemStyle.color).toBe('#f87171');
    expect(appDatum.itemStyle.color).toBe('#ff6b2c');
    expect(dbDatum.label.show).toBe(true);
  });

  it('배포 자체가 실패하면(outcome≠confirmed) 앱 트랙이 경고색으로 표시된다', () => {
    const option = buildDeployTrackOption(
      [record({ outcome: 'build_failed', expectedMigrationCount: 29, actualMigrationCount: 29 })],
      true
    ) as { series: BarSeries[] };
    const bar = option.series.find((series) => series.type === 'bar')!;
    const [dbDatum, appDatum] = bar.data;

    // 칸수는 같으니 DB 트랙 자체는 정상 색 — 문제가 있던 건 앱 쪽.
    expect(dbDatum.itemStyle.color).toBe('#60a5fa');
    expect(appDatum.itemStyle.color).toBe('#f87171');
  });

  it('배포 이력마다 앱/DB가 도달한 칸에 틱을 남긴다(중복 칸은 한 번만)', () => {
    const option = buildDeployTrackOption(
      [
        record({ sha: 'newest', timestamp: '2026-08-06T04:00:00Z', expectedMigrationCount: 29, actualMigrationCount: 29 }),
        record({ sha: 'middle', timestamp: '2026-08-05T04:00:00Z', expectedMigrationCount: 28, actualMigrationCount: 27 }),
        record({ sha: 'oldest', timestamp: '2026-08-04T04:00:00Z', expectedMigrationCount: 28, actualMigrationCount: 27 }),
      ],
      true
    ) as { series: Array<{ name: string; data: Array<[number, string]> }> };
    const appTicks = option.series.find((series) => series.name === '앱 배포 이력')!;
    const dbTicks = option.series.find((series) => series.name === 'DB 배포 이력')!;

    expect(appTicks.data.map((point) => point[0])).toEqual([28, 29]);
    expect(dbTicks.data.map((point) => point[0])).toEqual([27, 29]);
  });
});
