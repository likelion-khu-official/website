'use client';

import { useEffect, useState } from 'react';
import { getDeployHistory } from '@/lib/adminApi';
import DeployHistoryTrackChart, { OUTCOME_LABELS } from './DeployHistoryTrackChart';
import type { DeployRecord } from '@shared/types/deploy-history';

const ENVS = [
  { value: 'stage' as const, label: 'stage' },
  { value: 'prod' as const, label: 'prod' },
];

export default function DeployHistoryPanel() {
  const [env, setEnv] = useState<'stage' | 'prod'>('stage');
  const [records, setRecords] = useState<DeployRecord[] | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRecords(null);
    setError('');
    getDeployHistory(env, 30)
      .then((response) => {
        if (!cancelled) setRecords(response);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '배포 이력을 불러오지 못했어요.');
      });
    return () => {
      cancelled = true;
    };
  }, [env, retryIndex]);

  const outOfSyncCount = records?.filter((record) => record.expectedMigrationCount !== record.actualMigrationCount).length ?? 0;
  const failedCount = records?.filter((record) => record.outcome !== 'confirmed').length ?? 0;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="deploy-history-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted">APP × DB TRACK</p>
          <h2 id="deploy-history-title" className="mt-2 text-lg font-semibold text-white">배포 이력 — 앱·DB 정합성</h2>
          <p className="mt-1 text-sm text-muted">
            앱 트랙과 DB 트랙, 두 개의 가로 직선이 배포 시각별로 나란히 가요. 배포가 실패하거나 마이그레이션이 안 먹으면 그 구간만 빨간 점선으로 끊겨서 보여요.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="환경 선택">
          {ENVS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setEnv(option.value)}
              aria-pressed={env === option.value}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                env === option.value ? 'bg-white text-black' : 'border border-white/20 text-white/70 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : !records ? (
        <p className="p-6 text-sm text-muted" role="status">배포 이력을 불러오고 있어요…</p>
      ) : records.length === 0 ? (
        <p className="p-6 text-sm text-muted">이 환경엔 아직 기록된 배포 이력이 없어요.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 sm:p-6 sm:pb-0">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-muted">최근 {records.length}건 중 어긋난 배포</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${outOfSyncCount > 0 ? 'text-red-300' : 'text-white'}`}>{outOfSyncCount}건</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-muted">정상 배포 외 결과</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${failedCount > 0 ? 'text-red-300' : 'text-white'}`}>{failedCount}건</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-muted">가장 최근 배포 결과</p>
              <p className="mt-1 text-2xl font-semibold text-white">{OUTCOME_LABELS[records[0].outcome]}</p>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <DeployHistoryTrackChart records={records} />
          </div>
        </>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">
        조회만 가능해요 — 여기서 재배포·롤백 같은 조치는 안 되고, 문제가 보이면 RUNBOOK 절차대로 직접 판단·집행해야 해요.
      </p>
    </section>
  );
}
