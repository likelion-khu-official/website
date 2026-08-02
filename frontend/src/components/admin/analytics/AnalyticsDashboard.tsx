'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getAnalyticsPageViews, getVisitorAnalytics } from '@/lib/adminApi';
import AnalyticsTimeSeriesChart from './AnalyticsTimeSeriesChart';
import BlogAnalyticsPanel from './BlogAnalyticsPanel';
import ProjectAnalyticsPanel from './ProjectAnalyticsPanel';
import RecruitmentApplicationCard from './RecruitmentApplicationCard';
import DeviceAnalyticsPanel from './DeviceAnalyticsPanel';
import type {
  AnalyticsInterval,
  AnalyticsPageTotal,
  AnalyticsPageViewQuery,
  AnalyticsPageViewResponse,
  VisitorAnalyticsResponse,
} from '@shared/types/analytics';

const QUICK_RANGES = [7, 30, 90] as const;
const INTERVAL_LABELS: Record<AnalyticsInterval, string> = {
  day: '일별',
  week: '주별',
  month: '월별',
};

function kstToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function isDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

export function parseAnalyticsQuery(params: URLSearchParams, today = kstToday()): AnalyticsPageViewQuery {
  const defaultFrom = addDays(today, -29);
  const rawFrom = params.get('from');
  const rawTo = params.get('to');
  const interval = params.get('interval');
  const from = isDate(rawFrom) ? rawFrom : defaultFrom;
  const to = isDate(rawTo) ? rawTo : today;
  const validRange = from <= to;
  const page = params.get('page') || undefined;
  const blogPostId = Number(params.get('blog'));
  const projectId = Number(params.get('project'));

  return {
    from: validRange ? from : defaultFrom,
    to: validRange ? to : today,
    interval: interval === 'week' || interval === 'month' ? interval : 'day',
    ...(page ? { page } : {}),
    ...(Number.isInteger(blogPostId) && blogPostId > 0 ? { blogPostId } : {}),
    ...(Number.isInteger(projectId) && projectId > 0 ? { projectId } : {}),
  };
}

export function friendlyPageName(path: string) {
  if (path === '/') return '홈';
  if (path === '/projects') return '프로젝트 목록';
  if (path.startsWith('/projects/')) return '프로젝트 상세';
  if (path === '/blog') return '블로그 목록';
  if (path.startsWith('/blog/')) return '블로그 글';
  if (path === '/members') return '부원 소개';
  if (path === '/activities') return '활동 소개';
  if (path === '/recruit') return '모집 안내';
  if (path === '/apply') return '지원하기';
  if (path === '/faq') return '자주 묻는 질문';
  return '공개 페이지';
}

function inclusiveDays(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

function formatDateRange(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  return `${formatter.format(new Date(`${from}T00:00:00+09:00`))} – ${formatter.format(new Date(`${to}T00:00:00+09:00`))}`;
}

type SortKey = 'views' | 'path';

function DateRangeControls({
  query,
  activeQuickRange,
  onChange,
}: {
  query: AnalyticsPageViewQuery;
  activeQuickRange: (typeof QUICK_RANGES)[number] | undefined;
  onChange: (next: AnalyticsPageViewQuery) => void;
}) {
  const [draftFrom, setDraftFrom] = useState(query.from);
  const [draftTo, setDraftTo] = useState(query.to);
  const [dateError, setDateError] = useState('');

  function applyCustomRange(event: React.FormEvent) {
    event.preventDefault();
    if (!isDate(draftFrom) || !isDate(draftTo)) {
      setDateError('시작일과 종료일을 모두 선택해주세요.');
      return;
    }
    if (draftFrom > draftTo) {
      setDateError('시작일은 종료일보다 늦을 수 없어요.');
      return;
    }
    if (inclusiveDays(draftFrom, draftTo) > 732) {
      setDateError('한 번에 최대 2년까지 볼 수 있어요.');
      return;
    }
    setDateError('');
    onChange({ ...query, from: draftFrom, to: draftTo });
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5" aria-labelledby="period-title">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 id="period-title" className="text-sm font-semibold text-white">확인할 기간</h2>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="빠른 기간 선택">
            {QUICK_RANGES.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={activeQuickRange === days}
                onClick={() => {
                  const to = kstToday();
                  onChange({ ...query, from: addDays(to, -(days - 1)), to });
                }}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  activeQuickRange === days
                    ? 'border-accent bg-accent text-black'
                    : 'border-white/15 bg-white/[0.04] text-white hover:bg-white/10'
                }`}
              >
                최근 {days}일
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={applyCustomRange} className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="text-xs font-medium text-muted">
            시작일
            <input
              type="date"
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="mt-1 block min-h-11 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="text-xs font-medium text-muted">
            종료일
            <input
              type="date"
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              className="mt-1 block min-h-11 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <button type="submit" className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-accent">
            기간 적용
          </button>
        </form>
      </div>
      {dateError ? <p className="mt-3 text-sm text-red-300" role="alert">{dateError}</p> : null}
    </section>
  );
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseAnalyticsQuery(new URLSearchParams(searchParams.toString())), [searchParams]);

  const [data, setData] = useState<AnalyticsPageViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);
  const [visitorData, setVisitorData] = useState<VisitorAnalyticsResponse | null>(null);
  const [visitorLoading, setVisitorLoading] = useState(true);
  const [visitorError, setVisitorError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [sortAscending, setSortAscending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getAnalyticsPageViews(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setLoadError('');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : '이용 현황을 불러오지 못했어요.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, retryIndex]);

  useEffect(() => {
    let cancelled = false;
    getVisitorAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setVisitorData(response);
          setVisitorError('');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setVisitorError(error instanceof Error ? error.message : '순 방문자 현황을 불러오지 못했어요.');
        }
      })
      .finally(() => {
        if (!cancelled) setVisitorLoading(false);
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  const replaceQuery = useCallback((next: AnalyticsPageViewQuery) => {
    setLoading(true);
    setLoadError('');
    setVisitorLoading(true);
    setVisitorError('');
    const params = new URLSearchParams({ from: next.from, to: next.to, interval: next.interval });
    if (next.page) params.set('page', next.page);
    if (next.blogPostId) params.set('blog', String(next.blogPostId));
    if (next.projectId) params.set('project', String(next.projectId));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  const sortedPages = useMemo(() => {
    const pages = [...(data?.pages ?? [])];
    return pages.sort((a, b) => {
      const difference = sortKey === 'views'
        ? a.views - b.views
        : a.path.localeCompare(b.path, 'ko');
      return sortAscending ? difference : -difference;
    });
  }, [data?.pages, sortAscending, sortKey]);

  const activeQuickRange = QUICK_RANGES.find((days) =>
    inclusiveDays(query.from, query.to) === days && query.to === kstToday()
  );
  const graphLabel = query.page ? `${friendlyPageName(query.page)} 조회수` : '전체 페이지 조회수';

  function changeSort(next: SortKey) {
    if (sortKey === next) {
      setSortAscending((value) => !value);
    } else {
      setSortKey(next);
      setSortAscending(next === 'path');
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="border-b border-white/10 pb-7">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent">ANALYTICS</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">사이트 이용 현황</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          방문자가 공개 페이지를 얼마나 봤는지 기간별로 확인해요. 조회수는 같은 사람이 여러 번 연 경우도 모두 포함합니다.
        </p>
      </header>

      <RecruitmentApplicationCard />

      <DateRangeControls
        key={`${query.from}:${query.to}`}
        query={query}
        activeQuickRange={activeQuickRange}
        onChange={replaceQuery}
      />

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="views-chart-title">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted">PAGE VIEWS · KST</p>
            <h2 id="views-chart-title" className="mt-2 text-lg font-semibold text-white">{graphLabel} 추이</h2>
            <p className="mt-1 text-sm text-muted">{formatDateRange(query.from, query.to)}</p>
          </div>
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <p className="flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />조회수</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                {loading && !data ? '—' : (data?.totalViews ?? 0).toLocaleString('ko-KR')}
                <span className="ml-1 text-sm font-medium text-muted">회</span>
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-blue-400" aria-hidden="true" />추정 순 방문자</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                {visitorLoading && !visitorData ? '—' : (visitorData?.uniqueVisitors ?? 0).toLocaleString('ko-KR')}
                <span className="ml-1 text-sm font-medium text-muted">명</span>
              </p>
            </div>
            <label className="text-xs font-medium text-muted">
              묶어 보기
              <select
                value={query.interval}
                onChange={(event) => replaceQuery({ ...query, interval: event.target.value as AnalyticsInterval })}
                className="mt-1 block min-h-11 rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {Object.entries(INTERVAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="p-3 sm:p-5">
          {loadError ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center" role="alert">
              <p className="font-medium text-white">지금은 조회 추이를 불러올 수 없어요.</p>
              <p className="mt-2 text-sm text-muted">{loadError}</p>
              <button type="button" onClick={() => { setLoading(true); setLoadError(''); setRetryIndex((value) => value + 1); }} className="mt-5 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
            </div>
          ) : loading && !data ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-muted" role="status">조회 추이를 불러오고 있어요…</div>
          ) : data && data.totalViews === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
              <p className="font-medium text-white">이 기간에는 기록된 조회가 없어요.</p>
              <p className="mt-2 text-sm text-muted">기간을 넓히거나 다른 페이지를 선택해보세요.</p>
            </div>
          ) : data ? (
            <AnalyticsTimeSeriesChart
              points={data.series}
              label={graphLabel}
              comparison={visitorData ? {
                points: visitorData.series.map((point) => ({ date: point.date, views: point.visitors })),
                label: query.page ? `${friendlyPageName(query.page)} 추정 순 방문자` : '추정 순 방문자',
                unit: '명',
              } : undefined}
            />
          ) : null}
          {loading && data ? <p className="px-2 text-xs text-muted" role="status">새 조건으로 업데이트하고 있어요…</p> : null}
          {visitorError ? (
            <div className="mx-2 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-muted" role="alert">
              <span>조회수는 보이지만 순 방문자는 불러오지 못했어요. {visitorError}</span>
              <button type="button" onClick={() => { setVisitorLoading(true); setVisitorError(''); setRetryIndex((value) => value + 1); }} className="rounded text-white underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 시도</button>
            </div>
          ) : null}
        </div>
        <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">
          조회수는 반복해서 연 횟수까지 모두 세고, 추정 순 방문자는 같은 브라우저의 반복 조회를 선택 기간에 한 명으로 셉니다. 다른 기기나 브라우저 저장공간을 지운 경우에는 별도로 잡힐 수 있어요.
        </p>
      </section>

      <DeviceAnalyticsPanel key={`devices:${query.from}:${query.to}`} query={query} />

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="top-pages-title">
        <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h2 id="top-pages-title" className="text-lg font-semibold text-white">많이 본 페이지</h2>
            <p className="mt-1 text-sm text-muted">페이지를 누르면 위 그래프에서 그 페이지의 변화만 볼 수 있어요.</p>
          </div>
          {query.page ? (
            <button type="button" onClick={() => replaceQuery({ ...query, page: undefined })} className="min-h-11 self-start rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-sm text-orange-100 outline-none hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent sm:self-auto">
              전체 페이지로 돌아가기
            </button>
          ) : null}
        </div>

        {sortedPages.length === 0 && !loading ? (
          <p className="p-6 text-sm text-muted">이 기간에 비교할 페이지가 없어요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">이름</th>
                  <th scope="col" aria-sort={sortKey === 'path' ? (sortAscending ? 'ascending' : 'descending') : 'none'} className="hidden px-5 py-3 font-medium sm:table-cell">
                    <button type="button" onClick={() => changeSort('path')} className="rounded py-1 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-accent">페이지 경로 {sortKey === 'path' ? (sortAscending ? '↑' : '↓') : ''}</button>
                  </th>
                  <th scope="col" aria-sort={sortKey === 'views' ? (sortAscending ? 'ascending' : 'descending') : 'none'} className="px-5 py-3 text-right font-medium">
                    <button type="button" onClick={() => changeSort('views')} className="rounded py-1 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-accent">조회수 {sortKey === 'views' ? (sortAscending ? '↑' : '↓') : ''}</button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedPages.map((page: AnalyticsPageTotal) => {
                  const selected = query.page === page.path;
                  return (
                    <tr key={page.path} className={selected ? 'bg-accent/[0.08]' : 'hover:bg-white/[0.035]'}>
                      <td className="px-5 py-3.5 font-medium text-white">
                        <button type="button" aria-pressed={selected} onClick={() => replaceQuery({ ...query, page: selected ? undefined : page.path })} className="rounded text-left outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent">
                          <span className="block">{friendlyPageName(page.path)}</span>
                          <span className="mt-1 block font-mono text-xs font-normal text-orange-200 sm:hidden">{page.path}</span>
                        </button>
                      </td>
                      <td className="hidden px-5 py-3.5 font-mono text-xs text-orange-200 sm:table-cell">{page.path}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-white">{page.views.toLocaleString('ko-KR')}회</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <BlogAnalyticsPanel
        key={`blog:${query.from}:${query.to}:${query.interval}:${query.blogPostId ?? 'all'}`}
        query={query}
        onChange={replaceQuery}
      />

      <ProjectAnalyticsPanel
        key={`project:${query.from}:${query.to}:${query.interval}:${query.projectId ?? 'all'}`}
        query={query}
        onChange={replaceQuery}
      />

      <aside className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs leading-5 text-muted">
        운영 사이트의 공개 페이지만 집계합니다. 관리자·부원 화면, 개발·스테이지, 알려진 봇은 제외하며 날짜 경계는 한국 시간(KST)입니다. 개인을 식별하는 정보와 URL의 검색 조건은 저장하지 않습니다.
      </aside>
    </div>
  );
}
