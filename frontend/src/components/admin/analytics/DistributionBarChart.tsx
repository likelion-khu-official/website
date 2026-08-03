'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([BarChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer]);

export function buildDistributionOption(
  label: string,
  categories: string[],
  values: number[],
  reduceMotion: boolean,
  showValues: boolean,
): EChartsCoreOption {
  return {
    animation: !reduceMotion,
    aria: {
      enabled: true,
      description: `${label} 조회 분포 막대그래프. ${categories.map((category, index) => `${category} ${values[index]}회`).join(', ')}`,
    },
    grid: { left: 12, right: 12, top: showValues ? 28 : 16, bottom: 28, containLabel: true },
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
        return `${point.name}<br/><strong>${point.value.toLocaleString('ko-KR')}회 조회</strong>`;
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.16)' } },
      axisLabel: { color: '#a3a3a3', fontSize: 11, interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      axisLabel: { color: '#8b8b8b', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [{
      name: label,
      type: 'bar',
      data: values,
      barMaxWidth: 34,
      itemStyle: { color: '#ff6b2c', borderRadius: [5, 5, 0, 0] },
      emphasis: { itemStyle: { color: '#ff8a57' } },
      label: showValues ? { show: true, position: 'top', color: '#d4d4d4', fontSize: 10 } : { show: false },
    }],
  };
}

export default function DistributionBarChart({
  label,
  categories,
  values,
  showValues = false,
}: {
  label: string;
  categories: string[];
  values: number[];
  showValues?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container, null, { renderer: 'svg' });
    chart.setOption(buildDistributionOption(label, categories, values, reduceMotion, showValues));
    const handleResize = () => chart.resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    observer?.observe(container);
    window.addEventListener('resize', handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [categories, label, reduceMotion, showValues, values]);

  return <div ref={containerRef} className="h-64 w-full" />;
}
