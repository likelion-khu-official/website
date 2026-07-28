import type { Metadata } from 'next';
import MemberManagement from '@/components/admin/MemberManagement';

export const metadata: Metadata = {
  title: '멤버 관리 — 어드민',
};

export default function AdminMembersPage() {
  return <MemberManagement />;
}
