'use client';

import { useEffect, useState } from 'react';
import { getNotificationSignupAnalytics } from '@/lib/adminApi';
import AnalyticsTimeSeriesChart from './AnalyticsTimeSeriesChart';
import type { AnalyticsPageViewQuery, NotificationSignupAnalyticsResponse } from '@shared/types/analytics';

export default function NotificationSignupAnalyticsPanel({ query }: { query: AnalyticsPageViewQuery }) {
  const [data, setData] = useState<NotificationSignupAnalyticsResponse | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getNotificationSignupAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '모집 알림 신청 현황을 불러오지 못했어요.');
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="notification-signup-title">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">RECRUIT ALERTS</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="notification-signup-title" className="text-lg font-semibold text-white">모집 알림 신청</h2>
            <p className="mt-1 text-sm text-muted">평소 방문이 다음 모집을 기다리는 실제 알림 신청으로 얼마나 남았는지 봐요.</p>
          </div>
          {data ? (
            <p className="text-sm text-muted">선택 기간 <strong className="ml-1 text-3xl font-semibold tabular-nums text-white" aria-label={`새 모집 알림 신청 ${data.totalSignups}건`}>{data.totalSignups.toLocaleString('ko-KR')}</strong>건</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : !data ? (
        <p className="p-6 text-sm text-muted" role="status">모집 알림 신청을 불러오고 있어요…</p>
      ) : data.totalSignups === 0 ? (
        <p className="p-6 text-sm text-muted">이 기간에는 새로 저장된 모집 알림 신청이 없어요.</p>
      ) : (
        <div className="p-5 sm:p-6">
          <AnalyticsTimeSeriesChart
            points={data.series.map((point) => ({ date: point.date, views: point.signups }))}
            label="새 모집 알림 신청"
            valueLabel="신청 수"
          />
        </div>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">
        버튼 클릭이 아니라 DB에 새로 저장된 유효 신청만 셉니다. 같은 이메일의 반복 요청과 봇 요청은 늘어나지 않으며, 이메일 주소는 이 화면에 보내지 않아요.
      </p>
    </section>
  );
}
