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

  const pages = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <nav
      aria-label="페이지네이션"
      className="mt-10 flex items-center justify-center gap-2 text-sm"
    >
      <Link
        href={`/blog?page=${page - 1}`}
        aria-disabled={first}
        className={`rounded-full border border-white/10 px-3 py-1.5 ${
          first ? 'pointer-events-none opacity-30' : 'text-white hover:border-accent/40'
        }`}
      >
        이전
      </Link>

      <ul className="flex items-center gap-1">
        {pages.map((p) => (
          <li key={p}>
            <Link
              href={`/blog?page=${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                p === page ? 'bg-accent text-white' : 'text-muted hover:text-white'
              }`}
            >
              {p + 1}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={`/blog?page=${page + 1}`}
        aria-disabled={last}
        className={`rounded-full border border-white/10 px-3 py-1.5 ${
          last ? 'pointer-events-none opacity-30' : 'text-white hover:border-accent/40'
        }`}
      >
        다음
      </Link>
    </nav>
  );
}
