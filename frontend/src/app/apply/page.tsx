import type { Metadata } from 'next';
import ApplyForm from '@/components/apply/ApplyForm';

export const metadata: Metadata = {
  title: '지원하기 — 멋쟁이사자처럼 경희대',
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: '멋쟁이사자처럼 경희대학교',
      item: 'https://likelion-khu.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: '지원하기',
      item: 'https://likelion-khu.com/apply',
    },
  ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ApplyForm preview={preview} />
    </main>
  );
}
