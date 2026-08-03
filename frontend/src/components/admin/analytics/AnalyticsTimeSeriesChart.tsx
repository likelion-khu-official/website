'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { AnalyticsTimePoint } from '@shared/types/analytics';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, AriaComponent, SVGRenderer]);

function shortDate(value: string) {
  const [, month, day] = value.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function buildTimeSeriesOption(
  points: AnalyticsTimePoint[],
  label: string,
  reduceMotion: boolean,
  comparison?: { points: AnalyticsTimePoint[]; label: string; unit: string }
): EChartsCoreOption {
  const showZoomSlider = points.length > 60;

  return {
    animation: !reduceMotion,
    animationDuration: reduceMotion ? 0 : 320,
    color: ['#ff6b2c', '#60a5fa'],
    aria: {
      enabled: true,
      description: `${label}${comparison ? `와 ${comparison.label}` : ''} 기간별 선 그래프. 날짜별 정확한 수치는 그래프 다음 표에서 확인할 수 있습니다.`,
      decal: { show: false },
    },
    grid: {
      left: 12,
      right: 18,
      top: 24,
      bottom: showZoomSlider ? 68 : 34,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#171717',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: '#f5f5f5', fontSize: 13 },
      axisPointer: {
        type: 'line',
        lineStyle: { color: 'rgba(255,255,255,0.45)', width: 1, type: 'dashed' },
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((point) => point.date),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.16)' } },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(255,255,255,0.52)',
        hideOverlap: true,
        margin: 12,
        formatter: shortDate,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.52)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: 'ctrl',
        moveOnMouseMove: true,
      },
      ...(showZoomSlider
        ? [{
            type: 'slider' as const,
            start: 0,
            end: 100,
            height: 18,
            bottom: 12,
            borderColor: 'rgba(255,255,255,0.12)',
            fillerColor: 'rgba(255,107,44,0.18)',
            backgroundColor: 'rgba(255,255,255,0.03)',
            dataBackground: {
              lineStyle: { color: 'rgba(255,255,255,0.25)' },
              areaStyle: { color: 'rgba(255,255,255,0.06)' },
            },
            selectedDataBackground: {
              lineStyle: { color: '#ff6b2c' },
              areaStyle: { color: 'rgba(255,107,44,0.14)' },
            },
            textStyle: { color: 'rgba(255,255,255,0.52)' },
          }]
        : []),
    ],
    series: [
      {
        name: label,
        type: 'line',
        data: points.map((point) => point.views),
        // 집계점 사이에 실제로 관측하지 않은 곡선을 만들지 않는다. Grafana 기본처럼 직선으로 잇는다.
        smooth: false,
        showSymbol: points.length <= 14,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 2.5 },
        itemStyle: { borderColor: '#171717', borderWidth: 2 },
        areaStyle: { color: 'rgba(255,107,44,0.12)' },
        emphasis: { focus: 'series' },
        tooltip: {
          valueFormatter: (value: unknown) => `${Number(value).toLocaleString('ko-KR')}회`,
        },
      },
      ...(comparison ? [{
        name: comparison.label,
        type: 'line' as const,
        data: comparison.points.map((point) => point.views),
        smooth: false,
        showSymbol: comparison.points.length <= 14,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 2.5 },
        itemStyle: { borderColor: '#171717', borderWidth: 2 },
        emphasis: { focus: 'series' as const },
        tooltip: {
          valueFormatter: (value: unknown) => `${Number(value).toLocaleString('ko-KR')}${comparison.unit}`,
        },
      }] : []),
    ],
  };
}

interface AnalyticsTimeSeriesChartProps {
  points: AnalyticsTimePoint[];
  label: string;
  valueLabel?: string;
  comparison?: { points: AnalyticsTimePoint[]; label: string; unit: string };
}

export default function AnalyticsTimeSeriesChart({ points, label, valueLabel = '조회수', comparison }: AnalyticsTimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = echarts.init(container, null, { renderer: 'svg' });
    chart.setOption(buildTimeSeriesOption(points, label, reduceMotion, comparison));

    const handleResize = () => chart.resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    observer?.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [comparison, label, points, reduceMotion]);

  return (
    <>
      <div
        ref={containerRef}
        className="h-72 w-full sm:h-80 lg:h-96"
      />
      <table className="sr-only">
        <caption>{label}{comparison ? `와 ${comparison.label}` : ''} 날짜별 수치</caption>
        <thead>
          <tr><th>날짜</th><th>{valueLabel}</th>{comparison ? <th>{comparison.label}</th> : null}</tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.views}</td>
              {comparison ? <td>{comparison.points.find((item) => item.date === point.date)?.views ?? 0}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
