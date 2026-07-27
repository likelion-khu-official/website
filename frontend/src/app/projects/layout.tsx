import Link from 'next/link';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#131313] text-white">
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-9 w-auto object-contain" />
          <span className="hidden text-sm font-semibold tracking-[-0.02em] text-white/75 sm:block">
            멋쟁이사자처럼 경희대
          </span>
        </Link>
        <Link
          href="/#project"
          className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm text-white/65 transition hover:border-white/30 hover:text-white"
        >
          홈으로
        </Link>
      </header>
      {children}
    </div>
  );
}
