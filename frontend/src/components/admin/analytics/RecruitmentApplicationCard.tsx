'use client';

import { useEffect, useState } from 'react';
import { getRecruitmentAnalytics } from '@/lib/adminApi';
import type { RecruitmentAnalyticsResponse } from '@shared/types/analytics';

function formatDay(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}+09:00`));
}

function roundLabel(openedAt: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(`${openedAt}+09:00`)) + '에 시작한 모집';
}

export default function RecruitmentApplicationCard() {
  const [data, setData] = useState<RecruitmentAnalyticsResponse | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getRecruitmentAnalytics()
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '지원 수를 불러오지 못했어요.');
      });
    return () => { cancelled = true; };
  }, [retryIndex]);

  const period = data?.openedAt
    ? data.closedAt
      ? `${formatDay(data.openedAt)} – ${formatDay(data.closedAt)}`
      : `${formatDay(data.openedAt)}부터 진행 중`
    : '';

  return (
    <section className="mt-6 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.12] to-white/[0.035] p-5 sm:p-6" aria-labelledby="application-count-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="application-count-title" className="text-sm font-semibold text-white">지원 수</h2>
            {data?.state === 'OPEN' ? <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-200">모집 중</span> : null}
            {data?.state === 'CLOSED' ? <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/75">최근 종료 모집</span> : null}
          </div>

          {error ? (
            <div className="mt-3" role="alert">
              <p className="text-sm text-red-200">{error}</p>
              <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
            </div>
          ) : !data ? (
            <p className="mt-3 text-sm text-muted" role="status">지원 수를 불러오고 있어요…</p>
          ) : data.state === 'NONE' || !data.openedAt ? (
            <div className="mt-3">
              <p className="text-3xl font-bold text-white">–</p>
              <p className="mt-2 text-sm text-muted">아직 시작한 모집 기록이 없어요.</p>
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium text-orange-100">{roundLabel(data.openedAt)}</p>
              <p className="mt-1 text-sm text-muted">{period}</p>
            </>
          )}
        </div>

        {data && data.state !== 'NONE' && !error ? (
          <p className="leading-none text-white" aria-label={`접수된 지원서 ${data.applicationCount}건`}>
            <span className="text-5xl font-bold tabular-nums sm:text-6xl">{data.applicationCount.toLocaleString('ko-KR')}</span>
            <span className="ml-2 text-base font-medium text-muted">건</span>
          </p>
        ) : null}
      </div>
      <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-muted">
        실제로 접수된 지원서 수예요. 아래 조회 기간을 바꿔도 새 모집이 시작될 때까지 같은 모집 기준으로 집계합니다.
      </p>
    </section>
  );
}
