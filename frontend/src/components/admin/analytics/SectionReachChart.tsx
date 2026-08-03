'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { SectionReachTotal } from '@shared/types/analytics';

echarts.use([BarChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer]);

export const SECTION_LABELS = {
  PROJECT: '프로젝트',
  STAFF: '운영진',
  BLOG: '블로그',
  RECRUIT: '모집',
} as const;

export function buildSectionReachOption(sections: SectionReachTotal[], reduceMotion: boolean): EChartsCoreOption {
  return {
    animation: !reduceMotion,
    aria: {
      enabled: true,
      description: `랜딩 섹션별 도달 수 가로 막대그래프. ${sections.map((item) => `${SECTION_LABELS[item.section]} ${item.reaches}회`).join(', ')}`,
    },
    grid: { left: 74, right: 24, top: 12, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      backgroundColor: '#171717',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      textStyle: { color: '#f5f5f5', fontSize: 13 },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const point = params[0];
        return `${point.name}<br/><strong>${point.value.toLocaleString('ko-KR')}회 도달</strong>`;
      },
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#9a9a9a', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: sections.map((item) => SECTION_LABELS[item.section]),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#e5e5e5', fontSize: 12 },
    },
    series: [{
      name: '도달 수',
      type: 'bar',
      barMaxWidth: 28,
      itemStyle: { color: '#ff6b2c', borderRadius: [0, 6, 6, 0] },
      emphasis: { itemStyle: { color: '#ff8a57' } },
      data: sections.map((item) => item.reaches),
    }],
  };
}

export default function SectionReachChart({ sections }: { sections: SectionReachTotal[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container, null, { renderer: 'svg' });
    chart.setOption(buildSectionReachOption(sections, reduceMotion));
    const handleResize = () => chart.resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    observer?.observe(container);
    window.addEventListener('resize', handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [sections, reduceMotion]);

  return <div ref={containerRef} className="h-64 w-full" />;
}
