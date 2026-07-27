'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  memberName?: string;
};

export default function MemberProjectHeader({ memberName }: Props) {
  const pathname = usePathname();

  return (
    <header className="mx-auto mb-14 flex max-w-6xl items-center justify-between gap-4">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-auto shrink-0 object-contain" />
        <span className="hidden truncate text-sm font-semibold text-white/65 sm:block">
          멤버 프로젝트
        </span>
      </Link>
      <div className="flex items-center gap-3">
        {memberName ? (
          <span className="hidden text-sm text-white/45 sm:inline">{memberName} 님</span>
        ) : null}
        <Link
          href={`/member/login?returnTo=${encodeURIComponent(pathname)}`}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/55 transition hover:border-white/30 hover:text-white"
        >
          계정 전환
        </Link>
      </div>
    </header>
  );
}
