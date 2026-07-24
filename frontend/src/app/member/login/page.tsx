import type { Metadata } from 'next';
import { Suspense } from 'react';
import MemberLoginForm from '@/components/member/MemberLoginForm';

export const metadata: Metadata = {
  title: '로그인 — 멤버',
  robots: { index: false, follow: false },
};

export default function MemberLoginPage() {
  return (
    <Suspense>
      <MemberLoginForm />
    </Suspense>
  );
}
