import Link from 'next/link';
import Footer from '@/components/sections/Footer';

export default function ActivitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100svh] w-full overflow-x-hidden bg-[#131313] text-white">
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-10 sm:py-6 lg:px-16">
        <Link
          href="/"
          aria-label="멋쟁이사자처럼 경희대 홈"
          className="flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-9 w-auto object-contain" />
          <span className="hidden text-sm font-semibold tracking-[-0.02em] text-white/75 sm:block">
            멋쟁이사자처럼 경희대
          </span>
        </Link>
        <Link
          href="/#plan"
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/65 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          홈으로
        </Link>
      </header>
      {children}
      <Footer />
    </div>
  );
}
