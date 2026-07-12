'use client';

export default function BlogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 py-24 text-center">
      <p className="text-sm text-muted">글 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20"
      >
        다시 시도
      </button>
    </div>
  );
}
