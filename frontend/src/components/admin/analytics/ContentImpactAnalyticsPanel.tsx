'use client';

import { useEffect, useState } from 'react';
import { getContentImpactAnalytics } from '@/lib/adminApi';
import ContentImpactChart from './ContentImpactChart';
import type { AnalyticsContentType, AnalyticsPageViewQuery, ContentImpactAnalyticsResponse } from '@shared/types/analytics';

const TYPE_LABELS: Record<AnalyticsContentType, string> = { BLOG_POST: '블로그', PROJECT: '프로젝트' };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    .format(new Date(`${value.slice(0, 10)}T00:00:00+09:00`));
}

export default function ContentImpactAnalyticsPanel({
  query,
  onChange,
}: {
  query: AnalyticsPageViewQuery;
  onChange: (next: AnalyticsPageViewQuery) => void;
}) {
  const [data, setData] = useState<ContentImpactAnalyticsResponse | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getContentImpactAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '콘텐츠 공개 전후 변화를 불러오지 못했어요.');
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  const comparison = data?.comparison;
  const difference = comparison ? comparison.after.siteViews - comparison.before.siteViews : 0;
  const changeText = !comparison ? '' : comparison.before.siteViews === 0
    ? (comparison.after.siteViews === 0 ? '변화 없음' : `+${comparison.after.siteViews.toLocaleString('ko-KR')}회`)
    : `${difference >= 0 ? '+' : ''}${difference.toLocaleString('ko-KR')}회 (${difference >= 0 ? '+' : ''}${(difference / comparison.before.siteViews * 100).toFixed(1)}%)`;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="content-impact-title">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted">CONTENT RELEASES</p>
          <h2 id="content-impact-title" className="mt-2 text-lg font-semibold text-white">콘텐츠 공개 전후</h2>
          <p className="mt-1 text-sm text-muted">글이나 프로젝트를 공개한 날을 기준으로 같은 길이의 전후 조회를 비교해요.</p>
        </div>
        {data && data.contents.length > 0 ? (
          <label className="text-xs font-medium text-muted">
            비교할 콘텐츠
            <select
              value={comparison ? `${comparison.content.type}:${comparison.content.id}` : ''}
              onChange={(event) => {
                const [impactType, id] = event.target.value.split(':');
                onChange({ ...query, impactType: impactType as AnalyticsContentType, impactId: Number(id) });
              }}
              className="mt-1 block min-h-11 w-full max-w-full rounded-xl border border-white/15 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-72"
            >
              {data.contents.map((content) => (
                <option key={`${content.type}:${content.id}`} value={`${content.type}:${content.id}`}>
                  [{TYPE_LABELS[content.type]}] {content.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : !data ? (
        <p className="p-6 text-sm text-muted" role="status">콘텐츠 공개 전후를 불러오고 있어요…</p>
      ) : !comparison ? (
        <p className="p-6 text-sm text-muted">선택 기간에 새로 공개한 블로그 글이나 프로젝트가 없어요.</p>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">{TYPE_LABELS[comparison.content.type]} · {formatDate(comparison.content.publishedAt)} 공개</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${comparison.complete ? 'bg-white/10 text-white/70' : 'bg-amber-400/15 text-amber-100'}`}>
              {comparison.complete ? '7일 비교 완료' : `비교 진행 중 · 현재 ${comparison.comparisonDays}일씩`}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <p className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-muted">공개 전 {comparison.comparisonDays}일<br /><strong className="mt-1 block text-xl tabular-nums text-white">{comparison.before.siteViews.toLocaleString('ko-KR')}회</strong></p>
            <p className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-muted">공개 후 {comparison.comparisonDays}일<br /><strong className="mt-1 block text-xl tabular-nums text-white">{comparison.after.siteViews.toLocaleString('ko-KR')}회</strong></p>
            <p className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-muted">사이트 조회 변화<br /><strong className="mt-1 block text-xl tabular-nums text-white">{changeText}</strong></p>
          </div>
          <p className="mt-4 text-sm text-muted">공개 후 해당 콘텐츠 자체 조회 <strong className="text-white">{comparison.contentViewsAfter.toLocaleString('ko-KR')}회</strong></p>
          <ContentImpactChart
            points={comparison.series}
            publishedDate={comparison.content.publishedAt.slice(0, 10)}
            contentTitle={comparison.content.title}
          />
        </div>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">공개 전후에 함께 일어난 변화이며 콘텐츠 하나의 효과라고 단정할 수는 없어요. 공개 후 7일이 지나기 전에는 지난 기간도 같은 일수로 줄여 임시 비교합니다.</p>
    </section>
  );
}
