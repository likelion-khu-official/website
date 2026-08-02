'use client';

import { useEffect, useState } from 'react';
import { getKeyClickAnalytics } from '@/lib/adminApi';
import AnalyticsTimeSeriesChart from './AnalyticsTimeSeriesChart';
import type {
  AnalyticsPageViewQuery,
  KeyClickAction,
  KeyClickAnalyticsResponse,
  KeyClickLocation,
} from '@shared/types/analytics';

const ACTION_LABELS: Record<KeyClickAction, string> = {
  APPLY: '지원하기',
  NOTIFICATION: '모집 알림 신청',
  BLOG_MORE: '블로그 전체 보기',
  PROJECT_MORE: '모든 프로젝트',
  PROJECT_GITHUB: '프로젝트 GitHub',
};

const LOCATION_LABELS: Record<KeyClickLocation, string> = {
  LANDING_RECRUIT: '랜딩 모집 영역',
  APPLICATION_FORM: '지원서 화면',
  APPLICATION_CLOSED: '모집 종료 안내',
  LANDING_BLOG: '랜딩 블로그 영역',
  LANDING_PROJECT: '랜딩 프로젝트 영역',
  PROJECT_DETAIL: '프로젝트 상세',
};

export default function KeyClickAnalyticsPanel({
  query,
  onChange,
}: {
  query: AnalyticsPageViewQuery;
  onChange: (next: AnalyticsPageViewQuery) => void;
}) {
  const [data, setData] = useState<KeyClickAnalyticsResponse | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getKeyClickAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '주요 클릭 현황을 불러오지 못했어요.');
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  const selectedLabel = query.clickAction ? ACTION_LABELS[query.clickAction] : '전체 주요 행동';

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="key-click-title">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted">KEY CLICKS</p>
          <h2 id="key-click-title" className="mt-2 text-lg font-semibold text-white">주요 클릭</h2>
          <p className="mt-1 text-sm text-muted">방문자가 페이지를 본 뒤 지원·알림·콘텐츠 탐색 행동을 얼마나 눌렀는지 봐요.</p>
        </div>
        <label className="text-xs font-medium text-muted">
          확인할 행동
          <select
            value={query.clickAction ?? 'ALL'}
            onChange={(event) => onChange({
              ...query,
              clickAction: event.target.value === 'ALL' ? undefined : event.target.value as KeyClickAction,
            })}
            className="mt-1 block min-h-11 w-full rounded-xl border border-white/15 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-52"
          >
            <option value="ALL">전체 주요 행동</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : !data ? (
        <p className="p-6 text-sm text-muted" role="status">주요 클릭을 불러오고 있어요…</p>
      ) : (
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)] sm:p-6">
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-white">{selectedLabel} 추이</p>
              <p className="text-sm text-muted">합계 <strong className="text-lg tabular-nums text-white">{data.totalClicks.toLocaleString('ko-KR')}</strong>회</p>
            </div>
            <AnalyticsTimeSeriesChart
              points={data.series.map((point) => ({ date: point.date, views: point.clicks }))}
              label={`${selectedLabel} 클릭`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-sm">
              <thead className="text-xs text-muted"><tr><th className="pb-2 text-left font-medium">행동</th><th className="pb-2 text-left font-medium">누른 위치</th><th className="pb-2 text-right font-medium">클릭</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {data.clicks.map((item) => (
                  <tr key={`${item.action}:${item.location}`}>
                    <th scope="row" className="py-3 text-left font-medium text-white">{ACTION_LABELS[item.action]}</th>
                    <td className="py-3 text-muted">{LOCATION_LABELS[item.location]}</td>
                    <td className="py-3 text-right font-semibold tabular-nums text-white">{item.clicks.toLocaleString('ko-KR')}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">
        표에 적힌 주요 버튼만 셉니다. 클릭은 관심 신호이며, 지원 접수·알림 신청 성공 건수와는 다를 수 있어요.
      </p>
    </section>
  );
}
