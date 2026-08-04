import type { Metadata } from 'next';
import MemberDashboard from '@/components/member/MemberDashboard';

export const metadata: Metadata = {
  title: '멤버 홈 — 멋쟁이사자처럼 경희대',
};

export default function MemberPage() {
  return <MemberDashboard />;
}
