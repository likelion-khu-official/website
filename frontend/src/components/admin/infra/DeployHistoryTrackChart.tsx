'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, ScatterChart } from 'echarts/charts';
import { AriaComponent, GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { DeployOutcome, DeployRecord } from '@shared/types/deploy-history';

echarts.use([BarChart, ScatterChart, GridComponent, TooltipComponent, MarkLineComponent, AriaComponent, SVGRenderer]);

const APP_TRACK_COLOR = '#ff6b2c';
const DB_TRACK_COLOR = '#60a5fa';
const OK_COLOR = '#34d399';
const CRITICAL_COLOR = '#f87171';
const WARNING_COLOR = '#fbbf24';
const UNKNOWN_COLOR = '#9a9a9a';

export const OUTCOME_LABELS: Record<DeployOutcome, string> = {
  confirmed: '정상 배포',
  rolled_back: '자동 롤백',
  rollback_failed: '롤백 실패',
  manual_intervention_needed: '수동 개입 필요',
  migration_check_blocked: '마이그레이션 차단',
  build_failed: '빌드 실패',
  unknown: '알 수 없음',
};

function outcomeColor(outcome: DeployOutcome): string {
  if (outcome === 'confirmed') return OK_COLOR;
  if (outcome === 'migration_check_blocked') return WARNING_COLOR;
  if (outcome === 'unknown') return UNKNOWN_COLOR;
  return CRITICAL_COLOR;
}

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

interface TrackTick {
  cell: number;
  timestampLabel: string;
  sha: string;
  outcome: DeployOutcome;
}

interface TrackSummary {
  latestExpected: number;
  latestActual: number;
  latestOutcome: DeployOutcome;
  latestTimestampLabel: string;
  latestSha: string;
  gap: number;
  laggingLane: '앱' | 'DB' | null;
  appTicks: TrackTick[];
  dbTicks: TrackTick[];
}

/** 칸(cell) = 그 시점까지 누적된 마이그레이션 버전 수. 두 트랙이 같은 칸에 있으면 나란히, 아니면 뒤처진 칸수만큼 벌어진다. */
function summarize(records: DeployRecord[]): TrackSummary {
  // API는 최신 배포가 먼저 오므로, 트랙이 앞으로 나아간 순서(과거→최신)로 뒤집는다.
  const chronological = records.slice().reverse();
  const latest = chronological[chronological.length - 1];

  const appTicks: TrackTick[] = [];
  const dbTicks: TrackTick[] = [];
  const seenApp = new Set<number>();
  const seenDb = new Set<number>();
  for (const record of chronological) {
    const timestampLabel = shortKst(record.timestamp);
    const sha = record.sha.slice(0, 7);
    if (!seenApp.has(record.expectedMigrationCount)) {
      seenApp.add(record.expectedMigrationCount);
      appTicks.push({ cell: record.expectedMigrationCount, timestampLabel, sha, outcome: record.outcome });
    }
    if (!seenDb.has(record.actualMigrationCount)) {
      seenDb.add(record.actualMigrationCount);
      dbTicks.push({ cell: record.actualMigrationCount, timestampLabel, sha, outcome: record.outcome });
    }
  }

  const gap = latest.expectedMigrationCount - latest.actualMigrationCount;

  return {
    latestExpected: latest.expectedMigrationCount,
    latestActual: latest.actualMigrationCount,
    latestOutcome: latest.outcome,
    latestTimestampLabel: shortKst(latest.timestamp),
    latestSha: latest.sha.slice(0, 7),
    gap,
    laggingLane: gap > 0 ? 'DB' : gap < 0 ? '앱' : null,
    appTicks,
    dbTicks,
  };
}

export function buildDeployTrackOption(records: DeployRecord[], reduceMotion: boolean): EChartsCoreOption {
  const summary = summarize(records);
  const frontier = Math.max(summary.latestExpected, summary.latestActual);
  const axisMax = Math.max(frontier + 1, 4);

  const appColor = summary.latestOutcome !== 'confirmed' ? outcomeColor(summary.latestOutcome) : summary.laggingLane === '앱' ? CRITICAL_COLOR : APP_TRACK_COLOR;
  const dbColor = summary.laggingLane === 'DB' ? CRITICAL_COLOR : DB_TRACK_COLOR;

  const tickSeries = (name: string, ticks: TrackTick[], category: string) => ({
    name,
    type: 'scatter' as const,
    data: ticks.map((tick) => [tick.cell, category]),
    symbol: 'rect',
    symbolSize: [3, 20],
    itemStyle: { color: 'rgba(0,0,0,0.28)' },
    silent: false,
    tooltip: {
      formatter: (params: { dataIndex: number }) => {
        const tick = ticks[params.dataIndex];
        return `${category} · ${tick.cell}칸<br/>${tick.timestampLabel} · ${tick.sha}<br/><span style="color:${outcomeColor(tick.outcome)}">${OUTCOME_LABELS[tick.outcome]}</span>`;
      },
    },
  });

  return {
    animation: !reduceMotion,
    animationDuration: reduceMotion ? 0 : 320,
    aria: {
      enabled: true,
      description: `앱 트랙과 DB 트랙, 두 개의 나란한 가로 트랙. 앱은 ${summary.latestExpected}칸, DB는 ${summary.latestActual}칸까지 가 있습니다. ${summary.gap === 0 ? '두 트랙이 같은 칸에 있어 일치합니다.' : `${summary.laggingLane} 트랙이 ${Math.abs(summary.gap)}칸 뒤처져 있습니다.`}`,
      decal: { show: false },
    },
    grid: { left: 56, right: 90, top: 16, bottom: 34, containLabel: false },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#171717',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: '#f5f5f5', fontSize: 13 },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: axisMax,
      minInterval: 1,
      name: '누적 마이그레이션 칸수',
      nameTextStyle: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.52)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'category',
      data: ['DB', '앱'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#e5e5e5', fontSize: 13, fontWeight: 600 },
    },
    series: [
      {
        name: '트랙',
        type: 'bar',
        barWidth: 26,
        barCategoryGap: '55%',
        data: [
          {
            value: summary.latestActual,
            itemStyle: { color: dbColor, borderRadius: [0, 6, 6, 0] },
            label: summary.laggingLane === 'DB'
              ? { show: true, position: 'right', color: CRITICAL_COLOR, fontSize: 12, fontWeight: 600, formatter: () => `${Math.abs(summary.gap)}칸 뒤처짐` }
              : { show: false },
          },
          {
            value: summary.latestExpected,
            itemStyle: { color: appColor, borderRadius: [0, 6, 6, 0] },
            label: summary.laggingLane === '앱'
              ? { show: true, position: 'right', color: CRITICAL_COLOR, fontSize: 12, fontWeight: 600, formatter: () => `${Math.abs(summary.gap)}칸 뒤처짐` }
              : { show: false },
          },
        ],
        tooltip: {
          formatter: (params: { dataIndex: number }) => {
            const isDb = params.dataIndex === 0;
            const value = isDb ? summary.latestActual : summary.latestExpected;
            const label = isDb ? 'DB (실제 반영)' : '앱 (기대 버전)';
            return `${label}: ${value}칸<br/>${summary.latestTimestampLabel} · ${summary.latestSha}<br/><span style="color:${outcomeColor(summary.latestOutcome)}">${OUTCOME_LABELS[summary.latestOutcome]}</span>`;
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: true, position: 'end', color: 'rgba(255,255,255,0.55)', fontSize: 11, formatter: '최신 버전' },
          lineStyle: { type: 'dashed', color: 'rgba(255,255,255,0.35)', width: 1 },
          data: [{ xAxis: frontier }],
        },
      },
      tickSeries('앱 배포 이력', summary.appTicks, '앱'),
      tickSeries('DB 배포 이력', summary.dbTicks, 'DB'),
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

  const summary = summarize(records);

  return (
    <>
      <div ref={containerRef} className="h-40 w-full" />
      <table className="sr-only">
        <caption>앱이 기대하는 마이그레이션 칸수와 DB에 실제 반영된 칸수 비교</caption>
        <thead>
          <tr>
            <th>트랙</th>
            <th>칸수</th>
            <th>최근 배포 시각(KST)</th>
            <th>커밋</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>앱</td>
            <td>{summary.latestExpected}</td>
            <td>{summary.latestTimestampLabel}</td>
            <td>{summary.latestSha}</td>
            <td>{OUTCOME_LABELS[summary.latestOutcome]}</td>
          </tr>
          <tr>
            <td>DB</td>
            <td>{summary.latestActual}</td>
            <td>{summary.latestTimestampLabel}</td>
            <td>{summary.latestSha}</td>
            <td>{OUTCOME_LABELS[summary.latestOutcome]}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
