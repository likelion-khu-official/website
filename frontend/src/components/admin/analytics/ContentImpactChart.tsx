'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { ContentImpactTimePoint } from '@shared/types/analytics';

echarts.use([LineChart, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, AriaComponent, SVGRenderer]);

export function buildContentImpactOption(
  points: ContentImpactTimePoint[],
  publishedDate: string,
  contentTitle: string,
  reduceMotion: boolean,
): EChartsCoreOption {
  return {
    animation: !reduceMotion,
    color: ['#ff6b2c', '#60a5fa'],
    aria: {
      enabled: true,
      description: `${contentTitle} 공개 전후 조회 선 그래프. 주황색은 사이트 전체, 파란색은 해당 콘텐츠 조회이며 ${publishedDate}에 콘텐츠 공개 표시가 있습니다.`,
    },
    legend: { top: 0, textStyle: { color: '#d4d4d4', fontSize: 11 }, itemWidth: 18, itemHeight: 3 },
    grid: { left: 12, right: 20, top: 42, bottom: 32, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#171717',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      textStyle: { color: '#f5f5f5', fontSize: 13 },
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(255,255,255,0.45)', type: 'dashed' } },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((point) => point.date),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.16)' } },
      axisLabel: { color: '#9a9a9a', hideOverlap: true, formatter: (value: string) => value.slice(5).replace('-', '/') },
    },
    yAxis: {
      type: 'value', min: 0, minInterval: 1,
      axisLabel: { color: '#8b8b8b' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        name: '사이트 전체 조회', type: 'line', smooth: false,
        data: points.map((point) => point.siteViews),
        lineStyle: { width: 2.5 }, symbol: 'circle', symbolSize: 6,
        tooltip: { valueFormatter: (value: unknown) => `${Number(value).toLocaleString('ko-KR')}회` },
        markLine: {
          symbol: ['none', 'none'],
          label: { show: true, formatter: '콘텐츠 공개', color: '#f5f5f5', backgroundColor: '#333', padding: [4, 6] },
          lineStyle: { color: '#f5f5f5', type: 'dashed', width: 1.5 },
          data: [{ xAxis: publishedDate }],
        },
      },
      {
        name: '해당 콘텐츠 조회', type: 'line', smooth: false,
        data: points.map((point) => point.contentViews),
        lineStyle: { width: 2.5 }, symbol: 'circle', symbolSize: 6,
        tooltip: { valueFormatter: (value: unknown) => `${Number(value).toLocaleString('ko-KR')}회` },
      },
    ],
  };
}

export default function ContentImpactChart({
  points,
  publishedDate,
  contentTitle,
}: {
  points: ContentImpactTimePoint[];
  publishedDate: string;
  contentTitle: string;
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
    chart.setOption(buildContentImpactOption(points, publishedDate, contentTitle, reduceMotion));
    const handleResize = () => chart.resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    observer?.observe(container);
    window.addEventListener('resize', handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [contentTitle, points, publishedDate, reduceMotion]);

  return <div ref={containerRef} className="h-80 w-full sm:h-96" />;
}
