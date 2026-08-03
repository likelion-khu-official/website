'use client';

export default function BlogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-88px)] w-full max-w-[1440px] items-center px-5 pb-24 sm:px-10 lg:px-16">
      <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.025] px-6 py-20 text-center sm:py-28">
        <span className="text-3xl text-accent/70" aria-hidden>
          ◌
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-white">블로그 글을 불러오지 못했어요.</h1>
        <p className="mt-3 text-sm text-white/45">잠시 후 다시 시도해 주세요.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 min-h-11 rounded-full border border-white/20 bg-white/[0.06] px-5 py-2 text-sm font-semibold text-white outline-none transition hover:border-accent hover:bg-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
