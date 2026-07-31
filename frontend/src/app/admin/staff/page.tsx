import type { Metadata } from 'next';
import StaffManagement from '@/components/admin/StaffManagement';

export const metadata: Metadata = {
  title: '운영진 소개 관리 — 어드민',
};

export default function AdminStaffPage() {
  return <StaffManagement />;
}
