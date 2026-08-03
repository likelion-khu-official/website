import { describe, expect, it } from 'vitest';
import { buildContentImpactOption } from './ContentImpactChart';

describe('buildContentImpactOption', () => {
  it('공개일 표시와 전체·콘텐츠 실제 조회를 같은 그래프에 둔다', () => {
    const option = buildContentImpactOption([
      { date: '2026-07-19', siteViews: 10, contentViews: 0 },
      { date: '2026-07-20', siteViews: 18, contentViews: 7 },
    ], '2026-07-20', '운영 회고', true) as {
      animation: boolean;
      yAxis: { min: number };
      series: Array<{ data: number[]; markLine?: { data: Array<{ xAxis: string }> } }>;
    };

    expect(option.animation).toBe(false);
    expect(option.yAxis.min).toBe(0);
    expect(option.series[0].data).toEqual([10, 18]);
    expect(option.series[1].data).toEqual([0, 7]);
    expect(option.series[0].markLine?.data[0].xAxis).toBe('2026-07-20');
  });
});
