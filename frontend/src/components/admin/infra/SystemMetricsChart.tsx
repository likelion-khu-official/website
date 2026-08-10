'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, AriaComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { SystemMetricSample } from '@shared/types/system-metrics';
import { MEMORY_ALARM_THRESHOLD, DISK_ALARM_THRESHOLD } from '@/lib/systemMetricsThresholds';

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, AriaComponent, SVGRenderer]);

// dataviz 스킬 카테고리 팔레트(slot 1/2/8) — validate_palette.js로 다크 서페이스(#151516)
// 기준 CVD·명도·대비 전부 통과 확인된 조합(2026-08-10).
const CPU_COLOR = '#3987e5'; // blue
const MEMORY_COLOR = '#199e70'; // aqua
const DISK_COLOR = '#d95926'; // orange
const THRESHOLD_COLOR = '#e66767'; // status critical (dark)

function shortKst(iso: string): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

function toChronological(samples: SystemMetricSample[]): SystemMetricSample[] {
  return samples.slice().reverse();
}

function buildOption(samples: SystemMetricSample[], reduceMotion: boolean): EChartsCoreOption {
  const chronological = toChronological(samples);
  const labels = chronological.map((sample) => shortKst(sample.timestamp));

  const series = [
    {
      name: 'CPU',
      type: 'line' as const,
      data: chronological.map((sample) => sample.cpuPercent),
      symbol: 'none' as const,
      lineStyle: { width: 2, color: CPU_COLOR },
      itemStyle: { color: CPU_COLOR },
    },
    {
      name: '메모리',
      type: 'line' as const,
      data: chronological.map((sample) => sample.memoryPercent),
      symbol: 'none' as const,
      lineStyle: { width: 2, color: MEMORY_COLOR },
      itemStyle: { color: MEMORY_COLOR },
      markLine: {
        symbol: 'none' as const,
        silent: true,
        // 왼쪽 끝에, 자기 선 위쪽에 배치 — 디스크 임계치 라벨(85%와 5%p 차이라 가까움)과
        // 겹치지 않게 위/아래로 갈라둔다. 오른쪽 끝(position 기본값 'end')에 두면 실제
        // 데이터가 몰리는 구간과도 겹쳐서 왼쪽으로 옮김.
        label: {
          formatter: `메모리 임계치 ${MEMORY_ALARM_THRESHOLD}%`,
          color: THRESHOLD_COLOR,
          fontSize: 11,
          position: 'insideStartTop' as const,
        },
        lineStyle: { color: THRESHOLD_COLOR, type: 'dashed' as const, width: 1 },
        data: [{ yAxis: MEMORY_ALARM_THRESHOLD }],
      },
    },
    {
      name: '디스크',
      type: 'line' as const,
      data: chronological.map((sample) => sample.diskPercent),
      symbol: 'none' as const,
      lineStyle: { width: 2, color: DISK_COLOR },
      itemStyle: { color: DISK_COLOR },
      markLine: {
        symbol: 'none' as const,
        silent: true,
        label: {
          formatter: `디스크 임계치 ${DISK_ALARM_THRESHOLD}%`,
          color: THRESHOLD_COLOR,
          fontSize: 11,
          position: 'insideStartBottom' as const,
        },
        lineStyle: { color: THRESHOLD_COLOR, type: 'dashed' as const, width: 1 },
        data: [{ yAxis: DISK_ALARM_THRESHOLD }],
      },
    },
  ];

  return {
    animation: !reduceMotion,
    aria: { enabled: true, decal: { show: false } },
    grid: { left: 40, right: 16, top: 32, bottom: 28 },
    legend: {
      top: 0,
      textStyle: { color: '#c3c2b7', fontSize: 12 },
      itemWidth: 14,
      itemHeight: 8,
    },
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'cross' as const },
      valueFormatter: (value: number) => `${value}%`,
    },
    xAxis: {
      type: 'category' as const,
      data: labels,
      axisLine: { lineStyle: { color: '#383835' } },
      axisLabel: { color: '#898781', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: 100,
      axisLabel: { color: '#898781', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#2c2c2a' } },
    },
    series,
  };
}

export default function SystemMetricsChart({ samples }: { samples: SystemMetricSample[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = echarts.init(container, null, { renderer: 'svg' });
    chart.setOption(buildOption(samples, reduceMotion));

    const handleResize = () => chart.resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    observer?.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [samples, reduceMotion]);

  const chronological = toChronological(samples);

  return (
    <>
      <div ref={containerRef} className="h-64 w-full" />
      <table className="sr-only">
        <caption>시각별 CPU·메모리·디스크 사용률(%)</caption>
        <thead>
          <tr>
            <th>시각(KST)</th>
            <th>CPU</th>
            <th>메모리</th>
            <th>디스크</th>
          </tr>
        </thead>
        <tbody>
          {chronological.map((sample) => (
            <tr key={sample.timestamp}>
              <td>{shortKst(sample.timestamp)}</td>
              <td>{sample.cpuPercent}%</td>
              <td>{sample.memoryPercent}%</td>
              <td>{sample.diskPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export { buildOption, toChronological };
