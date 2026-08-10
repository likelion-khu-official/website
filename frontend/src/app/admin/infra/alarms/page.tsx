import type { Metadata } from 'next';
import AlarmStatusPanel from '@/components/admin/infra/AlarmStatusPanel';

export const metadata: Metadata = {
  title: '알람 상태 — 어드민',
};

export default function AdminInfraAlarmsPage() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.16em] text-muted">INFRA</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">알람 상태</h1>
      <p className="mt-1 text-sm text-muted">지금 알람이 울리는 중인지, 문제없는지 여기서 확인해요.</p>
      <AlarmStatusPanel />
    </div>
  );
}
