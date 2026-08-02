import { describe, expect, it } from 'vitest';
import { buildTimeSeriesOption } from './AnalyticsTimeSeriesChart';

describe('buildTimeSeriesOption', () => {
  it('Grafana식 축 툴팁과 교차선을 사용한다', () => {
    const option = buildTimeSeriesOption([
      { date: '2026-08-01', views: 2 },
      { date: '2026-08-02', views: 5 },
    ], '전체 페이지 조회수', false) as Record<string, unknown>;

    expect(option.tooltip).toMatchObject({
      trigger: 'axis',
      axisPointer: { type: 'line' },
    });
    expect(option.series).toMatchObject([{ name: '전체 페이지 조회수', type: 'line' }]);
  });

  it('긴 기간에는 ECharts 표준 확대 슬라이더를 추가한다', () => {
    const points = Array.from({ length: 61 }, (_, index) => ({
      date: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
      views: index,
    }));
    const option = buildTimeSeriesOption(points, '조회수', true) as { dataZoom: unknown[]; animation: boolean };

    expect(option.dataZoom).toHaveLength(2);
    expect(option.animation).toBe(false);
  });
});

