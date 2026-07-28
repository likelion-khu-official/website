import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MemberProjectEditor from '@/components/member/projects/MemberProjectEditor';

export const metadata: Metadata = {
  title: '프로젝트 수정 — 멋쟁이사자처럼 경희대',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditMemberProjectPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return <MemberProjectEditor projectId={id} />;
}
