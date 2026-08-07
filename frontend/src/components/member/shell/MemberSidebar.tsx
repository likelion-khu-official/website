'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemberSession } from '../hooks/memberSession';
import { MEMBER_NAV } from './navItems';

/**
 * 데스크탑(lg+) 전용 좌측 사이드바 내비게이션.
 * 상단 로고 → 내비 → (하단) 내 계정·계정 전환. 워크스페이스 셸이 고정 배치한다.
 */
export default function MemberSidebar() {
  const pathname = usePathname();
  const member = useMemberSession();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-white/10 bg-white/[0.015] px-4 py-6 lg:flex">
      <Link
        href="/"
        aria-label="멋쟁이사자처럼 경희대 홈"
        className="mb-8 flex min-h-11 items-center gap-2.5 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-8 w-auto shrink-0 object-contain" />
        <span className="truncate text-sm font-semibold text-white/75">멤버 공간</span>
      </Link>

      <nav aria-label="멤버 공간" className="flex flex-1 flex-col gap-1">
        {MEMBER_NAV.map(({ href, label, isActive, Icon }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active ? 'bg-white/[0.06] text-white' : 'text-white/55 hover:bg-white/[0.035] hover:text-white'
              }`}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                />
              ) : null}
              <Icon className={active ? 'text-accent' : 'text-white/45 group-hover:text-white/70'} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        {member ? (
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm text-white/70"
            >
              {member.name.slice(0, 1)}
            </span>
            <span className="min-w-0 truncate text-sm text-white/60">{member.name} 님</span>
          </div>
        ) : null}
        <Link
          href={`/member/login?returnTo=${encodeURIComponent(pathname)}`}
          className="flex min-h-11 items-center justify-center rounded-xl border border-white/12 px-3 text-xs text-white/55 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          계정 전환
        </Link>
      </div>
    </aside>
  );
}
