import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuditLogViewer from '@/components/admin/AuditLogViewer';

export const metadata: Metadata = {
  title: '감사 로그 — 어드민',
};

export default function AdminAuditLogsPage() {
  return (
    <Suspense fallback={<p className="py-24 text-center text-sm text-muted">감사로그를 준비하고 있어요…</p>}>
      <AuditLogViewer />
    </Suspense>
  );
}
