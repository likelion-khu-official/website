import type { Metadata } from 'next';
import AdminAccountManagement from '@/components/admin/AdminAccountManagement';

export const metadata: Metadata = {
  title: '관리자 계정 — 어드민',
};

export default function AdminAccountsPage() {
  return <AdminAccountManagement />;
}
