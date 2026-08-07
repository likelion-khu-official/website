'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MEMBER_NAV } from './navItems';

/** 모바일(lg 미만) 상단 슬림 바 — 로고 + 계정 전환. */
export function MemberMobileHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-background/80 px-5 backdrop-blur-xl lg:hidden">
      <Link
        href="/"
        aria-label="멋쟁이사자처럼 경희대 홈"
        className="flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-7 w-auto object-contain" />
        <span className="text-sm font-semibold text-white/70">멤버 공간</span>
      </Link>
      <Link
        href={`/member/login?returnTo=${encodeURIComponent(pathname)}`}
        className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-3.5 text-xs text-white/55 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        계정 전환
      </Link>
    </header>
  );
}

/** 모바일(lg 미만) 하단 탭바 — 4개 내비를 아이콘+라벨로. */
export function MemberBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="멤버 공간"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-background/90 backdrop-blur-xl lg:hidden"
    >
      {MEMBER_NAV.map(({ href, label, isActive, Icon }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
              active ? 'text-accent' : 'text-white/50'
            }`}
          >
            <Icon width={22} height={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
