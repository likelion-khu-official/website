import type { Metadata } from 'next';
import MemberProjectsDashboard from '@/components/member/projects/MemberProjectsDashboard';

export const metadata: Metadata = {
  title: '내 프로젝트 — 멋쟁이사자처럼 경희대',
};

export default function MemberProjectsPage() {
  return <MemberProjectsDashboard />;
}
