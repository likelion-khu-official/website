import type { Metadata } from 'next';
import RecruitmentManagement from '@/components/admin/RecruitmentManagement';

export const metadata: Metadata = {
  title: '모집 관리 — 어드민',
};

export default function AdminRecruitmentPage() {
  return <RecruitmentManagement />;
}
