'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBlogAnalytics } from '@/lib/adminApi';
import AnalyticsTimeSeriesChart from './AnalyticsTimeSeriesChart';
import type {
  AnalyticsPageViewQuery,
  BlogAnalyticsPostTotal,
  BlogAnalyticsResponse,
} from '@shared/types/analytics';

function formatPublishedAt(value: string | null) {
  if (!value) return '게시일 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

export default function BlogAnalyticsPanel({
  query,
  onChange,
}: {
  query: AnalyticsPageViewQuery;
  onChange: (next: AnalyticsPageViewQuery) => void;
}) {
  const [data, setData] = useState<BlogAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);
  const [ascending, setAscending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBlogAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '블로그 조회 현황을 불러오지 못했어요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  const posts = useMemo(() => {
    const values = [...(data?.posts ?? [])];
    return values.sort((a, b) => ascending ? a.views - b.views : b.views - a.views);
  }, [ascending, data?.posts]);
  const selected = data?.posts.find((post) => post.id === query.blogPostId);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="blog-analytics-title">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted">BLOG</p>
          <h2 id="blog-analytics-title" className="mt-2 text-lg font-semibold text-white">블로그 글별 조회수</h2>
          <p className="mt-1 text-sm text-muted">어떤 글이 읽혔는지 비교하고, 글을 누르면 날짜별 변화를 볼 수 있어요.</p>
        </div>
        {selected ? (
          <button type="button" onClick={() => onChange({ ...query, blogPostId: undefined })} className="min-h-11 self-start rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-sm text-orange-100 outline-none hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent sm:self-auto">
            글 선택 해제
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="font-medium text-white">지금은 블로그 조회수를 불러올 수 없어요.</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <button type="button" onClick={() => { setLoading(true); setError(''); setRetryIndex((value) => value + 1); }} className="mt-4 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : loading ? (
        <p className="p-6 text-sm text-muted" role="status">글별 조회수를 불러오고 있어요…</p>
      ) : posts.length === 0 ? (
        <p className="p-6 text-sm text-muted">게시했거나 숨긴 블로그 글이 아직 없어요.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">글</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">게시일</th>
                  <th scope="col" aria-sort={ascending ? 'ascending' : 'descending'} className="px-5 py-3 text-right font-medium">
                    <button type="button" onClick={() => setAscending((value) => !value)} className="rounded py-1 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-accent">조회수 {ascending ? '↑' : '↓'}</button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {posts.map((post: BlogAnalyticsPostTotal) => {
                  const isSelected = post.id === query.blogPostId;
                  return (
                    <tr key={post.id} className={isSelected ? 'bg-accent/[0.08]' : 'hover:bg-white/[0.035]'}>
                      <td className="px-5 py-3.5">
                        <button type="button" aria-pressed={isSelected} onClick={() => onChange({ ...query, blogPostId: isSelected ? undefined : post.id })} className="max-w-xl rounded text-left outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent">
                          <span className="block font-medium text-white">{post.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span className="font-mono text-orange-200">/{post.slug}</span>
                            <span className={`rounded-full px-2 py-0.5 ${post.status === 'HIDDEN' ? 'bg-white/10 text-white/65' : 'bg-emerald-400/10 text-emerald-200'}`}>
                              {post.status === 'HIDDEN' ? '숨김' : '공개'}
                            </span>
                            <span className="md:hidden">{formatPublishedAt(post.publishedAt)}</span>
                          </span>
                        </button>
                      </td>
                      <td className="hidden px-5 py-3.5 text-muted md:table-cell">{formatPublishedAt(post.publishedAt)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-white">{post.views.toLocaleString('ko-KR')}회</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected ? (
            <div className="border-t border-white/10 p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">선택한 글</p>
                  <h3 className="mt-1 font-semibold text-white">{selected.title} 조회 추이</h3>
                </div>
                <p className="text-2xl font-bold tabular-nums text-white">{data?.totalViews.toLocaleString('ko-KR')}<span className="ml-1 text-sm font-medium text-muted">회</span></p>
              </div>
              {data && data.totalViews > 0 ? (
                <AnalyticsTimeSeriesChart points={data.series} label={`${selected.title} 조회수`} />
              ) : (
                <div className="flex min-h-48 items-center justify-center text-sm text-muted">이 기간에는 이 글의 조회가 없어요.</div>
              )}
            </div>
          ) : (
            <p className="border-t border-white/10 p-5 text-sm text-muted sm:p-6">위 글을 하나 선택하면 이 자리에 날짜별 조회 그래프가 나타나요.</p>
          )}
        </>
      )}
    </section>
  );
}

