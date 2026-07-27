import Link from 'next/link';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-5 py-3 sm:px-10 sm:py-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden>←</span> 멋쟁이사자처럼 경희대
        </Link>
      </header>
      <main className="flex-1 px-5 pb-20 sm:px-10 sm:pb-24">{children}</main>
    </div>
  );
}
