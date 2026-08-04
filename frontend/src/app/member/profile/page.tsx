import type { Metadata } from 'next';
import MemberProfileEditor from '@/components/member/profile/MemberProfileEditor';

export const metadata: Metadata = {
  title: '프로필 편집 — 멋쟁이사자처럼 경희대',
};

export default function MemberProfilePage() {
  return <MemberProfileEditor />;
}
