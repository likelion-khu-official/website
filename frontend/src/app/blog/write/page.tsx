import type { Metadata } from 'next';
import WriteForm from '@/components/blog/WriteForm';

export const metadata: Metadata = {
  title: '글쓰기 — 멋쟁이사자처럼 경희대',
  robots: { index: false, follow: false },
};

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return <WriteForm token={token ?? null} />;
}
