'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { AriaComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { DeviceAnalyticsTotal } from '@shared/types/analytics';

echarts.use([PieChart, TooltipComponent, AriaComponent, SVGRenderer]);

const LABELS = { MOBILE: '모바일', DESKTOP: '데스크톱', OTHER: '기타' } as const;

export function buildDeviceRatioOption(devices: DeviceAnalyticsTotal[], reduceMotion: boolean): EChartsCoreOption {
  return {
    animation: !reduceMotion,
    color: ['#ff6b2c', '#60a5fa', '#8b8b8b'],
    aria: {
      enabled: true,
      description: `기기별 페이지 조회 비율 도넛 그래프. ${devices.map((item) => `${LABELS[item.device]} ${item.percentage}%`).join(', ')}`,
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#171717',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      textStyle: { color: '#f5f5f5', fontSize: 13 },
      formatter: (params: { name: string; value: number; data: { percentage: number } }) =>
        `${params.name}<br/><strong>${params.value.toLocaleString('ko-KR')}회 · ${params.data.percentage.toFixed(1)}%</strong>`,
    },
    series: [{
      name: '기기 비율',
      type: 'pie',
      radius: ['58%', '82%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { scaleSize: 6 },
      itemStyle: { borderColor: '#191919', borderWidth: 3 },
      data: devices.map((item) => ({
        name: LABELS[item.device],
        value: item.views,
        percentage: item.percentage,
      })),
    }],
  };
}

export default function DeviceRatioChart({ devices }: { devices: DeviceAnalyticsTotal[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container, null, { renderer: 'svg' });
    chart.setOption(buildDeviceRatioOption(devices, reduceMotion));
    const handleResize = () => chart.resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    observer?.observe(container);
    window.addEventListener('resize', handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [devices, reduceMotion]);

  return <div ref={containerRef} className="h-56 w-full" />;
}
