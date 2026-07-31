import type { Metadata } from 'next';
import AuditLogViewer from '@/components/admin/AuditLogViewer';

export const metadata: Metadata = {
  title: '감사 로그 — 어드민',
};

export default function AdminAuditLogsPage() {
  return <AuditLogViewer />;
}
