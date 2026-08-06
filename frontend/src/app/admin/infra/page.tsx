import type { Metadata } from 'next';
import DeployHistoryPanel from '@/components/admin/infra/DeployHistoryPanel';

export const metadata: Metadata = {
  title: '인프라 — 어드민',
};

export default function AdminInfraPage() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.16em] text-muted">INFRA</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">인프라 상태</h1>
      <p className="mt-1 text-sm text-muted">배포·서버 상태를 SSH 없이 여기서 확인해요.</p>
      <DeployHistoryPanel />
    </div>
  );
}
