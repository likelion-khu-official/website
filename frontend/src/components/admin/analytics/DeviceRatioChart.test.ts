import { describe, expect, it } from 'vitest';
import { buildDeviceRatioOption } from './DeviceRatioChart';

describe('buildDeviceRatioOption', () => {
  it('제품 분석 도구에서 익숙한 도넛과 세 기기 분류를 만든다', () => {
    const option = buildDeviceRatioOption([
      { device: 'MOBILE', views: 6, percentage: 60 },
      { device: 'DESKTOP', views: 3, percentage: 30 },
      { device: 'OTHER', views: 1, percentage: 10 },
    ], true) as { animation: boolean; series: Array<{ type: string; radius: string[]; data: unknown[] }> };

    expect(option.animation).toBe(false);
    expect(option.series[0]).toMatchObject({ type: 'pie', radius: ['58%', '82%'] });
    expect(option.series[0].data).toHaveLength(3);
  });
});
