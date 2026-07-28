import type { Metadata } from 'next';
import MemberPostsDashboard from '@/components/member/posts/MemberPostsDashboard';

export const metadata: Metadata = {
  title: '내 글 — 멋쟁이사자처럼 경희대',
};

export default function MemberPostsPage() {
  return <MemberPostsDashboard />;
}
