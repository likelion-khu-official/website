'use client';

import { useEffect, useMemo, useState } from 'react';
import { getProjectAnalytics } from '@/lib/adminApi';
import AnalyticsTimeSeriesChart from './AnalyticsTimeSeriesChart';
import type {
  AnalyticsPageViewQuery,
  ProjectAnalyticsResponse,
  ProjectAnalyticsTotal,
} from '@shared/types/analytics';

export default function ProjectAnalyticsPanel({
  query,
  onChange,
}: {
  query: AnalyticsPageViewQuery;
  onChange: (next: AnalyticsPageViewQuery) => void;
}) {
  const [data, setData] = useState<ProjectAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);
  const [ascending, setAscending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProjectAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '프로젝트 조회 현황을 불러오지 못했어요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  const projects = useMemo(() => {
    const values = [...(data?.projects ?? [])];
    return values.sort((a, b) => ascending ? a.views - b.views : b.views - a.views);
  }, [ascending, data?.projects]);
  const selected = data?.projects.find((project) => project.id === query.projectId);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="project-analytics-title">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted">PROJECTS</p>
          <h2 id="project-analytics-title" className="mt-2 text-lg font-semibold text-white">프로젝트별 조회수</h2>
          <p className="mt-1 text-sm text-muted">어떤 프로젝트가 관심을 받았는지 비교하고, 프로젝트를 누르면 날짜별 변화를 볼 수 있어요.</p>
        </div>
        {selected ? (
          <button type="button" onClick={() => onChange({ ...query, projectId: undefined })} className="min-h-11 self-start rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-sm text-orange-100 outline-none hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent sm:self-auto">
            프로젝트 선택 해제
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="font-medium text-white">지금은 프로젝트 조회수를 불러올 수 없어요.</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <button type="button" onClick={() => { setLoading(true); setError(''); setRetryIndex((value) => value + 1); }} className="mt-4 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : loading ? (
        <p className="p-6 text-sm text-muted" role="status">프로젝트별 조회수를 불러오고 있어요…</p>
      ) : projects.length === 0 ? (
        <p className="p-6 text-sm text-muted">등록된 프로젝트가 아직 없어요.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">프로젝트</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">기수</th>
                  <th scope="col" aria-sort={ascending ? 'ascending' : 'descending'} className="px-5 py-3 text-right font-medium">
                    <button type="button" onClick={() => setAscending((value) => !value)} className="rounded py-1 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-accent">조회수 {ascending ? '↑' : '↓'}</button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {projects.map((project: ProjectAnalyticsTotal) => {
                  const isSelected = project.id === query.projectId;
                  return (
                    <tr key={project.id} className={isSelected ? 'bg-accent/[0.08]' : 'hover:bg-white/[0.035]'}>
                      <td className="px-5 py-3.5">
                        <button type="button" aria-pressed={isSelected} onClick={() => onChange({ ...query, projectId: isSelected ? undefined : project.id })} className="max-w-xl rounded text-left outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent">
                          <span className="block font-medium text-white">{project.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span className="sm:hidden">{project.cohort}기</span>
                            <span className={`rounded-full px-2 py-0.5 ${project.hidden ? 'bg-white/10 text-white/65' : 'bg-emerald-400/10 text-emerald-200'}`}>
                              {project.hidden ? '숨김' : '공개'}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="hidden px-5 py-3.5 text-muted sm:table-cell">{project.cohort}기</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-white">{project.views.toLocaleString('ko-KR')}회</td>
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
                  <p className="text-xs text-muted">선택한 프로젝트</p>
                  <h3 className="mt-1 font-semibold text-white">{selected.title} 조회 추이</h3>
                </div>
                <p className="text-2xl font-bold tabular-nums text-white">{data?.totalViews.toLocaleString('ko-KR')}<span className="ml-1 text-sm font-medium text-muted">회</span></p>
              </div>
              {data && data.totalViews > 0 ? (
                <AnalyticsTimeSeriesChart points={data.series} label={`${selected.title} 조회수`} />
              ) : (
                <div className="flex min-h-48 items-center justify-center text-sm text-muted">이 기간에는 이 프로젝트의 조회가 없어요.</div>
              )}
            </div>
          ) : (
            <p className="border-t border-white/10 p-5 text-sm text-muted sm:p-6">위 프로젝트를 하나 선택하면 이 자리에 날짜별 조회 그래프가 나타나요.</p>
          )}
        </>
      )}
    </section>
  );
}
