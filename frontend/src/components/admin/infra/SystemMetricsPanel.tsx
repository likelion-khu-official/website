'use client';

import { useEffect, useState } from 'react';
import { getSystemMetrics } from '@/lib/adminApi';
import SystemMetricsChart from './SystemMetricsChart';
import type { SystemMetricSample } from '@shared/types/system-metrics';
import { MEMORY_ALARM_THRESHOLD, DISK_ALARM_THRESHOLD } from '@/lib/systemMetricsThresholds';

// 5분 간격 스냅샷 기준 - infra/scripts/snapshot-system-metrics.py와 맞춤.
const RANGES = [
  { label: '6시간', limit: 72 },
  { label: '24시간', limit: 288 },
  { label: '7일', limit: 2016 },
] as const;

function StatTile({ label, value, overThreshold }: { label: string; value: number | null; overThreshold: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${overThreshold ? 'text-red-300' : 'text-white'}`}>
        {value === null ? '—' : `${value}%`}
      </p>
    </div>
  );
}

export default function SystemMetricsPanel() {
  const [rangeIndex, setRangeIndex] = useState(1); // 기본 24시간
  const [samples, setSamples] = useState<SystemMetricSample[] | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  const limit = RANGES[rangeIndex].limit;

  useEffect(() => {
    let cancelled = false;
    getSystemMetrics(limit)
      .then((response) => {
        if (!cancelled) {
          setSamples(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '시스템 지표를 불러오지 못했어요.');
      });
    return () => {
      cancelled = true;
    };
  }, [limit, retryIndex]);

  const latest = samples && samples.length > 0 ? samples[0] : null;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="system-metrics-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted">SYSTEM METRICS</p>
          <h2 id="system-metrics-title" className="mt-2 text-lg font-semibold text-white">서버 리소스 — CPU·메모리·디스크</h2>
          <p className="mt-1 text-sm text-muted">
            인스턴스 하나가 stage·prod를 같이 서빙해서 환경 구분 없이 하나의 시계열만 있어요. 5분마다 갱신돼요.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="기간 선택">
          {RANGES.map((range, index) => (
            <button
              key={range.label}
              type="button"
              onClick={() => {
                // 범위를 바꾸면 이전 범위의 데이터를 새 응답이 올 때까지 보여주지 않는다 —
                // 안 그러면 "6시간"을 눌렀는데 화면엔 아직 7일치 수치가 남아있는 순간이 생긴다.
                setSamples(null);
                setRangeIndex(index);
              }}
              aria-pressed={rangeIndex === index}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                rangeIndex === index ? 'bg-white text-black' : 'border border-white/20 text-white/70 hover:bg-white/10'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : !samples ? (
        <p className="p-6 text-sm text-muted" role="status">시스템 지표를 불러오고 있어요…</p>
      ) : samples.length === 0 ? (
        <p className="p-6 text-sm text-muted">아직 기록된 지표가 없어요.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 p-5 sm:p-6 sm:pb-0">
            <StatTile label="CPU (현재)" value={latest?.cpuPercent ?? null} overThreshold={false} />
            <StatTile
              label="메모리 (현재)"
              value={latest?.memoryPercent ?? null}
              overThreshold={(latest?.memoryPercent ?? 0) >= MEMORY_ALARM_THRESHOLD}
            />
            <StatTile
              label="디스크 (현재)"
              value={latest?.diskPercent ?? null}
              overThreshold={(latest?.diskPercent ?? 0) >= DISK_ALARM_THRESHOLD}
            />
          </div>
          <div className="p-5 sm:p-6">
            <SystemMetricsChart samples={samples} />
          </div>
        </>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">
        조회만 가능해요 — 임계치를 넘으면 여기서 먼저 보이겠지만, 실제 알람(이메일)은 OCI Monitoring이 따로 판단해요.
      </p>
    </section>
  );
}
