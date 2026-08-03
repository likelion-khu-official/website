import { describe, expect, it } from 'vitest';
import { buildSectionReachOption } from './SectionReachChart';

describe('buildSectionReachOption', () => {
  it('랜딩 순서와 정확한 도달 수를 가로 막대에 유지한다', () => {
    const option = buildSectionReachOption([
      { section: 'PROJECT', reaches: 120 },
      { section: 'STAFF', reaches: 88 },
      { section: 'BLOG', reaches: 54 },
      { section: 'RECRUIT', reaches: 31 },
    ], true) as {
      animation: boolean;
      yAxis: { data: string[] };
      series: Array<{ type: string; data: number[] }>;
    };

    expect(option.animation).toBe(false);
    expect(option.yAxis.data).toEqual(['프로젝트', '운영진', '블로그', '모집']);
    expect(option.series[0]).toMatchObject({ type: 'bar', data: [120, 88, 54, 31] });
  });
});
