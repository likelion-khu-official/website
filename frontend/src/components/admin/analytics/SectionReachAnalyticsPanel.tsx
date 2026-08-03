'use client';

import { useEffect, useState } from 'react';
import { getSectionReachAnalytics } from '@/lib/adminApi';
import SectionReachChart, { SECTION_LABELS } from './SectionReachChart';
import type { AnalyticsPageViewQuery, SectionReachAnalyticsResponse } from '@shared/types/analytics';

export default function SectionReachAnalyticsPanel({ query }: { query: AnalyticsPageViewQuery }) {
  const [data, setData] = useState<SectionReachAnalyticsResponse | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSectionReachAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '랜딩 섹션 도달 수를 불러오지 못했어요.');
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  const totalReaches = data?.sections.reduce((sum, item) => sum + item.reaches, 0) ?? 0;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="section-reach-title">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">LANDING SECTIONS</p>
        <h2 id="section-reach-title" className="mt-2 text-lg font-semibold text-white">랜딩 섹션 도달</h2>
        <p className="mt-1 text-sm text-muted">긴 홈에서 방문자가 프로젝트·운영진·블로그·모집 중 어디까지 내려왔는지 비교해요.</p>
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : !data ? (
        <p className="p-6 text-sm text-muted" role="status">섹션 도달 수를 불러오고 있어요…</p>
      ) : totalReaches === 0 ? (
        <p className="p-6 text-sm text-muted">이 기간에는 기록된 섹션 도달이 없어요.</p>
      ) : (
        <div className="grid items-center gap-4 p-5 sm:grid-cols-[minmax(280px,1.35fr)_minmax(230px,0.65fr)] sm:p-6">
          <SectionReachChart sections={data.sections} />
          <table className="w-full text-sm">
            <thead className="sr-only"><tr><th>랜딩 섹션</th><th>도달 수</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {data.sections.map((item) => (
                <tr key={item.section}>
                  <th scope="row" className="py-3 text-left font-medium text-white">{SECTION_LABELS[item.section]}</th>
                  <td className="py-3 text-right font-semibold tabular-nums text-white">{item.reaches.toLocaleString('ko-KR')}회</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">
        각 섹션의 시작이 화면 안쪽에 들어오면 한 번 도달한 것으로 셉니다. 같은 방문에서 위아래로 다시 움직여도 중복해서 세지 않아요.
      </p>
    </section>
  );
}
