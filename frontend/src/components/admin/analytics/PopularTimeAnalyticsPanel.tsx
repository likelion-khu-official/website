'use client';

import { useEffect, useMemo, useState } from 'react';
import { getPopularTimeAnalytics } from '@/lib/adminApi';
import DistributionBarChart from './DistributionBarChart';
import type { AnalyticsPageViewQuery, AnalyticsWeekday, PopularTimeAnalyticsResponse } from '@shared/types/analytics';

const WEEKDAY_LABELS: Record<AnalyticsWeekday, string> = {
  MONDAY: '월', TUESDAY: '화', WEDNESDAY: '수', THURSDAY: '목', FRIDAY: '금', SATURDAY: '토', SUNDAY: '일',
};

function hourLabel(hour: number) {
  if (hour === 0) return '자정–오전 1시';
  if (hour < 12) return `오전 ${hour}–${hour + 1}시`;
  if (hour === 12) return '낮 12시–오후 1시';
  return `오후 ${hour - 12}–${hour === 23 ? '자정' : `${hour - 11}시`}`;
}

export default function PopularTimeAnalyticsPanel({ query }: { query: AnalyticsPageViewQuery }) {
  const [data, setData] = useState<PopularTimeAnalyticsResponse | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPopularTimeAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '인기 시간대와 요일을 불러오지 못했어요.');
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  const peaks = useMemo(() => {
    if (!data || data.totalViews === 0) return null;
    const hour = data.hours.reduce((best, item) => item.views > best.views ? item : best);
    const weekday = data.weekdays.reduce((best, item) => item.views > best.views ? item : best);
    return { hour, weekday };
  }, [data]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="popular-time-title">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">POPULAR TIMES</p>
        <h2 id="popular-time-title" className="mt-2 text-lg font-semibold text-white">방문이 몰린 때</h2>
        <p className="mt-1 text-sm text-muted">게시·모집 안내를 사람들이 실제로 사이트를 보는 때에 맞출 수 있도록 한국시간 기준으로 보여줘요.</p>
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : !data ? (
        <p className="p-6 text-sm text-muted" role="status">인기 시간대와 요일을 불러오고 있어요…</p>
      ) : !peaks ? (
        <p className="p-6 text-sm text-muted">이 기간에는 비교할 페이지 조회가 없어요.</p>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-muted">가장 많은 시간대<br /><strong className="mt-1 block text-base text-white">{hourLabel(peaks.hour.hour)} · {peaks.hour.views.toLocaleString('ko-KR')}회</strong></p>
            <p className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-muted">가장 많은 요일<br /><strong className="mt-1 block text-base text-white">{WEEKDAY_LABELS[peaks.weekday.day]}요일 · {peaks.weekday.views.toLocaleString('ko-KR')}회</strong></p>
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.65fr_1fr]">
            <div>
              <h3 className="text-sm font-medium text-white">시간대별 조회</h3>
              <p className="mt-1 text-xs text-muted">0·3·6시처럼 3시간 간격으로 표시하고, 막대에 올리면 정확한 값을 볼 수 있어요.</p>
              <DistributionBarChart label="시간대별" categories={data.hours.map((item) => item.hour % 3 === 0 ? `${item.hour}시` : '')} values={data.hours.map((item) => item.views)} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">요일별 조회</h3>
              <p className="mt-1 text-xs text-muted">월요일부터 일요일까지 같은 축으로 비교해요.</p>
              <DistributionBarChart label="요일별" categories={data.weekdays.map((item) => WEEKDAY_LABELS[item.day])} values={data.weekdays.map((item) => item.views)} showValues />
            </div>
          </div>
        </div>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">두 그래프는 모두 0회부터 시작하고 실제 조회 건수를 사용합니다. 표본이 적으면 가장 높은 막대만 보고 게시 시간을 단정하지 마세요.</p>
    </section>
  );
}
