import Link from 'next/link';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <span aria-hidden>←</span> 멋쟁이사자처럼 경희대
        </Link>
      </header>
      <main className="flex-1 px-6 pb-24 sm:px-10">{children}</main>
    </div>
  );
}
