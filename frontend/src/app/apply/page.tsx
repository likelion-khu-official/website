import type { Metadata } from 'next';
import ApplyForm from '@/components/apply/ApplyForm';

export const metadata: Metadata = {
  title: '지원하기 — 멋쟁이사자처럼 경희대',
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const params = await searchParams;
  const preview = params.preview === '1';

  return (
    <main className="min-h-screen w-full px-6 py-20">
      <ApplyForm preview={preview} />
    </main>
  );
}
