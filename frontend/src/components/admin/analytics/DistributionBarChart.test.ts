import { describe, expect, it } from 'vitest';
import { buildDistributionOption } from './DistributionBarChart';

describe('buildDistributionOption', () => {
  it('실제 건수와 0부터 시작하는 축을 그대로 유지한다', () => {
    const option = buildDistributionOption('요일별', ['월', '화'], [2, 1], true, true) as {
      yAxis: { min: number };
      series: Array<{ data: number[]; label: { show: boolean } }>;
    };

    expect(option.yAxis.min).toBe(0);
    expect(option.series[0].data).toEqual([2, 1]);
    expect(option.series[0].label.show).toBe(true);
  });
});
