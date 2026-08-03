'use client';

import { useEffect, useState } from 'react';
import { getDeviceAnalytics } from '@/lib/adminApi';
import DeviceRatioChart from './DeviceRatioChart';
import type { AnalyticsDeviceType, AnalyticsPageViewQuery, DeviceAnalyticsResponse } from '@shared/types/analytics';

const DEVICE_META: Record<AnalyticsDeviceType, { label: string; color: string }> = {
  MOBILE: { label: '모바일', color: 'bg-accent' },
  DESKTOP: { label: '데스크톱', color: 'bg-blue-400' },
  OTHER: { label: '기타', color: 'bg-neutral-500' },
};

export default function DeviceAnalyticsPanel({ query }: { query: AnalyticsPageViewQuery }) {
  const [data, setData] = useState<DeviceAnalyticsResponse | null>(null);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDeviceAnalytics(query)
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '기기 비율을 불러오지 못했어요.');
      });
    return () => { cancelled = true; };
  }, [query, retryIndex]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="device-analytics-title">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">DEVICES</p>
        <h2 id="device-analytics-title" className="mt-2 text-lg font-semibold text-white">기기 비율</h2>
        <p className="mt-1 text-sm text-muted">방문자가 어느 화면에서 주로 사이트를 보는지 페이지 조회 기준으로 비교해요.</p>
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : !data ? (
        <p className="p-6 text-sm text-muted" role="status">기기 비율을 불러오고 있어요…</p>
      ) : data.totalViews === 0 ? (
        <p className="p-6 text-sm text-muted">이 기간에는 기기를 비교할 조회가 없어요.</p>
      ) : (
        <div className="grid items-center gap-2 p-5 sm:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1.2fr)] sm:p-6">
          <DeviceRatioChart devices={data.devices} />
          <div>
            <p className="mb-3 text-xs text-muted">전체 {data.totalViews.toLocaleString('ko-KR')}회</p>
            <table className="w-full text-sm">
              <thead className="sr-only"><tr><th>기기</th><th>조회수</th><th>비율</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {data.devices.map((item) => (
                  <tr key={item.device}>
                    <th scope="row" className="py-3 text-left font-medium text-white">
                      <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${DEVICE_META[item.device].color}`} aria-hidden="true" />
                      {DEVICE_META[item.device].label}
                    </th>
                    <td className="py-3 text-right tabular-nums text-muted">{item.views.toLocaleString('ko-KR')}회</td>
                    <td className="w-20 py-3 text-right font-semibold tabular-nums text-white">{item.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs leading-5 text-muted">알 수 없는 기기도 버리지 않고 ‘기타’에 포함합니다. 세부 기기명과 원본 브라우저 정보는 저장하지 않아요.</p>
          </div>
        </div>
      )}
    </section>
  );
}
