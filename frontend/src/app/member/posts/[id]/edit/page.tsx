import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WriteForm from '@/components/blog/WriteForm';

export const metadata: Metadata = {
  title: '글 수정 — 멋쟁이사자처럼 경희대',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditMemberPostPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  return <WriteForm postId={id} />;
}
