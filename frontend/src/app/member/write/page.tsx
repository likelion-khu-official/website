import type { Metadata } from 'next';
import WriteForm from '@/components/blog/WriteForm';

export const metadata: Metadata = {
  title: '글쓰기 — 멋쟁이사자처럼 경희대',
  robots: { index: false, follow: false },
};

export default function WritePage() {
  return <WriteForm />;
}
