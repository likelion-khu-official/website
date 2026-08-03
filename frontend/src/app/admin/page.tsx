import type { Metadata } from 'next';
import { Suspense } from 'react';
import AnalyticsDashboard from '@/components/admin/analytics/AnalyticsDashboard';

export const metadata: Metadata = {
  title: '이용 현황 — 어드민',
};

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl" role="status" aria-live="polite">
          <p className="text-sm text-muted">이용 현황을 준비하고 있어요…</p>
        </div>
      }
    >
      <AnalyticsDashboard />
    </Suspense>
  );
}
