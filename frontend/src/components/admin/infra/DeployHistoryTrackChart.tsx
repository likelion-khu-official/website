'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, ScatterChart } from 'echarts/charts';
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { DeployOutcome, DeployRecord } from '@shared/types/deploy-history';

echarts.use([LineChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent, SVGRenderer]);

const APP_TRACK_COLOR = '#ff6b2c';
const DB_TRACK_COLOR = '#60a5fa';
const CRITICAL_COLOR = '#f87171';

export const OUTCOME_LABELS: Record<DeployOutcome, string> = {
  confirmed: '정상 배포',
  rolled_back: '자동 롤백',
  rollback_failed: '롤백 실패',
  manual_intervention_needed: '수동 개입 필요',
  migration_check_blocked: '마이그레이션 차단',
  build_failed: '빌드 실패',
  unknown: '알 수 없음',
};

/** 이 레포는 저장 시각을 UTC로 남기고 화면엔 항상 KST로 바꿔 보여준다(KST 표시 버그 재발 방지). */
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

function toChronological(records: DeployRecord[]): DeployRecord[] {
  // API는 최신 배포가 먼저 오므로, 실제 배포 순서(과거→최신)로 뒤집는다.
  return records.slice().reverse();
}

type NullableNum = number | null;

/** i-1→i 구간 하나만 그리는 선 시리즈. 그 구간에 도착한 배포가 ok면 트랙 색 실선, 아니면 빨간 점선. */
function buildSegments(chronological: DeployRecord[], y: number, ok: boolean[], color: string) {
  const n = chronological.length;
  const series = [];
  for (let i = 1; i < n; i += 1) {
    const data: NullableNum[] = new Array(n).fill(null);
    data[i - 1] = y;
    data[i] = y;
    series.push({
      name: `__segment-${y}-${i}`,
      type: 'line' as const,
      data,
      symbol: 'none' as const,
      connectNulls: false,
      silent: true,
      tooltip: { show: false },
      lineStyle: ok[i]
        ? { width: 2, color }
        : { width: 2, color: CRITICAL_COLOR, type: 'dashed' as const },
    });
  }
  return series;
}

function buildMarkers(name: string, chronological: DeployRecord[], y: number, ok: boolean[], color: string) {
  const n = chronological.length;
  return {
    name,
    type: 'scatter' as const,
    data: chronological.map((_, index) => {
      const isLast = index === n - 1;
      return {
        value: y,
        symbolSize: isLast ? 16 : 9,
        itemStyle: { color: ok[index] ? color : CRITICAL_COLOR },
      };
    }),
  };
}

export function buildDeployTrackOption(records: DeployRecord[], reduceMotion: boolean): EChartsCoreOption {
  const chronological = toChronological(records);
  const n = chronological.length;
  const labels = chronological.map((record) => shortKst(record.timestamp));
  const latest = chronological[n - 1];
  const latestInSync = latest.expectedMigrationCount === latest.actualMigrationCount;
  const latestGap = Math.abs(latest.expectedMigrationCount - latest.actualMigrationCount);

  const appOk = chronological.map((record) => record.outcome === 'confirmed');
  const dbOk = chronological.map((record) => record.expectedMigrationCount === record.actualMigrationCount);

  return {
    animation: !reduceMotion,
    animationDuration: reduceMotion ? 0 : 320,
    aria: {
      enabled: true,
      description: `앱 트랙과 DB 트랙, 두 개의 나란한 가로 직선. 같은 배포는 같은 칸에 위치합니다. 배포가 실패하면 그 구간의 트랙만 빨간 점선으로 바뀝니다. ${latestInSync ? '지금은 두 트랙 모두 정상입니다.' : `지금 DB가 마이그레이션 ${latestGap}개만큼 뒤처져 있습니다.`}`,
      decal: { show: false },
    },
    legend: {
      data: ['앱', 'DB'],
      top: 0,
      textStyle: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
      itemWidth: 14,
      itemHeight: 10,
    },
    grid: { left: 32, right: 32, top: 56, bottom: 44 },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#171717',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: '#f5f5f5', fontSize: 13 },
      formatter: (rawParams: unknown) => {
        const params = rawParams as { seriesName: string; dataIndex: number };
        const record = chronological[params.dataIndex];
        if (!record) return '';
        const isApp = params.seriesName === '앱';
        const line = isApp
          ? `앱 커밋: ${record.sha.slice(0, 7)}`
          : `DB 누적 마이그레이션: ${record.actualMigrationCount}개 (앱 기대: ${record.expectedMigrationCount}개)`;
        const inSync = record.expectedMigrationCount === record.actualMigrationCount;
        const syncLine = inSync
          ? '<span style="color:#34d399">앱-DB 일치</span>'
          : `<span style="color:${CRITICAL_COLOR}">DB가 마이그레이션 ${record.expectedMigrationCount - record.actualMigrationCount}개만큼 뒤처짐</span>`;
        return [
          `${shortKst(record.timestamp)}`,
          line,
          `<span style="color:${record.outcome === 'confirmed' ? '#34d399' : CRITICAL_COLOR}">${OUTCOME_LABELS[record.outcome]}</span>`,
          syncLine,
        ].join('<br/>');
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: true,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.16)' } },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.52)', fontSize: 11, hideOverlap: true },
    },
    yAxis: { type: 'value', min: -0.35, max: 1.35, show: false },
    series: [
      ...buildSegments(chronological, 1, appOk, APP_TRACK_COLOR),
      ...buildSegments(chronological, 0, dbOk, DB_TRACK_COLOR),
      buildMarkers('앱', chronological, 1, appOk, APP_TRACK_COLOR),
      buildMarkers('DB', chronological, 0, dbOk, DB_TRACK_COLOR),
    ],
  };
}

export default function DeployHistoryTrackChart({ records }: { records: DeployRecord[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = echarts.init(container, null, { renderer: 'svg' });
    chart.setOption(buildDeployTrackOption(records, reduceMotion));

    const handleResize = () => chart.resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    observer?.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [records, reduceMotion]);

  const chronological = toChronological(records);

  return (
    <>
      <div ref={containerRef} className="h-56 w-full" />
      <table className="sr-only">
        <caption>배포마다 앱 커밋과 DB 누적 마이그레이션 수 비교</caption>
        <thead>
          <tr>
            <th>시각(KST)</th>
            <th>앱 커밋</th>
            <th>DB 누적 마이그레이션 수</th>
            <th>결과</th>
            <th>일치 여부</th>
          </tr>
        </thead>
        <tbody>
          {chronological.map((record) => (
            <tr key={`${record.timestamp}-${record.sha}`}>
              <td>{shortKst(record.timestamp)}</td>
              <td>{record.sha.slice(0, 7)}</td>
              <td>{record.actualMigrationCount}</td>
              <td>{OUTCOME_LABELS[record.outcome]}</td>
              <td>{record.expectedMigrationCount === record.actualMigrationCount ? '일치' : '불일치'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
