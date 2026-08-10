import type { Metadata } from 'next';
import SystemMetricsPanel from '@/components/admin/infra/SystemMetricsPanel';

export const metadata: Metadata = {
  title: '시스템 지표 — 어드민',
};

export default function AdminInfraMetricsPage() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.16em] text-muted">INFRA</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">시스템 지표</h1>
      <p className="mt-1 text-sm text-muted">서버 CPU·메모리·디스크 사용량을 여기서 확인해요.</p>
      <SystemMetricsPanel />
    </div>
  );
}
