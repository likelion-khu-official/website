import type { Metadata } from 'next';
import MemberProjectEditor from '@/components/member/projects/MemberProjectEditor';

export const metadata: Metadata = {
  title: '새 프로젝트 등록 — 멋쟁이사자처럼 경희대',
};

export default function NewMemberProjectPage() {
  return <MemberProjectEditor />;
}
