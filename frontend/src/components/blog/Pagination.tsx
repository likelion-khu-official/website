import Link from 'next/link';

export default function Pagination({
  page,
  totalPages,
  first,
  last,
}: {
  page: number; // 0-indexed
  totalPages: number;
  first: boolean;
  last: boolean;
}) {
  if (totalPages <= 1) return null;

  const pages: Array<number | string> =
    totalPages <= 7
      ? Array.from({ length: totalPages }, (_, i) => i)
      : page <= 3
        ? [0, 1, 2, 3, 4, 'ellipsis-end', totalPages - 1]
        : page >= totalPages - 4
          ? [0, 'ellipsis-start', ...Array.from({ length: 5 }, (_, i) => totalPages - 5 + i)]
          : [0, 'ellipsis-start', page - 1, page, page + 1, 'ellipsis-end', totalPages - 1];

  return (
    <nav
      aria-label="페이지네이션"
      className="mt-10 flex items-center justify-center gap-2 text-sm"
    >
      <Link
        href={`/blog?page=${page - 1}`}
        aria-disabled={first}
        className={`inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-white/10 px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          first ? 'pointer-events-none opacity-30' : 'text-white hover:border-accent/40'
        }`}
      >
        <span aria-hidden>←</span>
        <span className="hidden sm:inline">이전</span>
      </Link>

      <span className="inline-flex h-11 min-w-20 items-center justify-center rounded-full border border-white/10 text-muted sm:hidden">
        {page + 1} / {totalPages}
      </span>

      <ul className="hidden items-center gap-1 sm:flex">
        {pages.map((p) => (
          <li key={p} className="flex h-11 w-11 items-center justify-center">
            {typeof p === 'number' ? (
              <Link
                href={`/blog?page=${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={`flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  p === page ? 'bg-accent text-white' : 'text-muted hover:text-white'
                }`}
              >
                {p + 1}
              </Link>
            ) : (
              <span aria-hidden className="text-muted">
                …
              </span>
            )}
          </li>
        ))}
      </ul>

      <Link
        href={`/blog?page=${page + 1}`}
        aria-disabled={last}
        className={`inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-white/10 px-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          last ? 'pointer-events-none opacity-30' : 'text-white hover:border-accent/40'
        }`}
      >
        <span className="hidden sm:inline">다음</span>
        <span aria-hidden>→</span>
      </Link>
    </nav>
  );
}
