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

interface MarkerDatum { itemStyle: { color: string } }
type MarkerSeries = { name: string; type: string; data: MarkerDatum[] };
type SegmentSeries = { name: string; type: string; lineStyle: { color: string; type?: string } };
type Option = { xAxis: { data: string[] }; series: Array<MarkerSeries | SegmentSeries> };

function markers(option: Option, name: '앱' | 'DB') {
  return option.series.find((series) => series.name === name && series.type === 'scatter') as MarkerSeries;
}

function segments(option: Option) {
  return option.series.filter((series) => series.name.startsWith('__segment-')) as SegmentSeries[];
}

describe('buildDeployTrackOption', () => {
  it('최신이 먼저 오는 API 순서를 뒤집어 실제 배포 순서(과거→최신)로 x축에 놓는다', () => {
    const option = buildDeployTrackOption(
      [record({ timestamp: '2026-08-06T04:00:00Z' }), record({ timestamp: '2026-08-01T01:00:00Z' })],
      true
    ) as unknown as Option;

    expect(option.xAxis.data).toEqual(['08/01 10:00', '08/06 13:00']);
  });

  it('앱-DB가 일치하면 두 트랙의 현재 점이 각자 트랙 색이다', () => {
    const option = buildDeployTrackOption([record({})], true) as unknown as Option;

    expect(markers(option, '앱').data[0].itemStyle.color).toBe('#ff6b2c');
    expect(markers(option, 'DB').data[0].itemStyle.color).toBe('#60a5fa');
  });

  it('DB 마이그레이션이 못 따라가면 DB 트랙의 현재 점만 빨간색이 된다', () => {
    const option = buildDeployTrackOption(
      [record({ expectedMigrationCount: 32, actualMigrationCount: 29 })],
      true
    ) as unknown as Option;

    expect(markers(option, '앱').data[0].itemStyle.color).toBe('#ff6b2c');
    expect(markers(option, 'DB').data[0].itemStyle.color).toBe('#f87171');
  });

  it('배포 자체가 실패하면(outcome≠confirmed) 앱 트랙의 현재 점이 빨간색이 된다', () => {
    const option = buildDeployTrackOption(
      [record({ outcome: 'build_failed', expectedMigrationCount: 29, actualMigrationCount: 29 })],
      true
    ) as unknown as Option;

    expect(markers(option, '앱').data[0].itemStyle.color).toBe('#f87171');
    expect(markers(option, 'DB').data[0].itemStyle.color).toBe('#60a5fa');
  });

  it('앱이 실패한 배포 구간만 빨간 점선이 되고, 그 옆 DB 구간은 정상 실선으로 남는다', () => {
    const option = buildDeployTrackOption(
      [
        record({ timestamp: '2026-08-06T04:00:00Z', outcome: 'build_failed' }), // 최신(API상 첫 항목)
        record({ timestamp: '2026-08-01T01:00:00Z', outcome: 'confirmed' }),
      ],
      true
    ) as unknown as Option;

    const appSegment = segments(option).find((series) => series.lineStyle.color === '#f87171' || series.lineStyle.color === '#ff6b2c')!;
    const dbSegment = segments(option).find((series) => series.lineStyle.color === '#60a5fa')!;

    expect(appSegment.lineStyle).toMatchObject({ color: '#f87171', type: 'dashed' });
    expect(dbSegment.lineStyle).toMatchObject({ color: '#60a5fa' });
    expect(dbSegment.lineStyle.type).toBeUndefined();
  });
});
