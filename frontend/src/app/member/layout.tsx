import type { Metadata } from 'next';
import MemberShell from '@/components/member/shell/MemberShell';

export const metadata: Metadata = {
  title: '멤버 — 멋쟁이사자처럼 경희대',
  robots: { index: false, follow: false },
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100svh] bg-background text-foreground">
      <MemberShell>{children}</MemberShell>
    </div>
  );
}
