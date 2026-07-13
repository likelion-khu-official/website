import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: '대시보드 — 어드민',
};

export default function AdminHomePage() {
  return <AdminDashboard />;
}
