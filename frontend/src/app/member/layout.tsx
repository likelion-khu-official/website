import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '멤버 — 멋쟁이사자처럼 경희대',
  robots: { index: false, follow: false },
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex-1 px-6 py-10 sm:px-10">{children}</main>
    </div>
  );
}
