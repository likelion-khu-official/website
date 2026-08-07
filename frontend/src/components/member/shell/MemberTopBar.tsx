'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemberSession } from '../hooks/memberSession';

type NavItem = { href: string; label: string; isActive: (pathname: string) => boolean };

const NAV: NavItem[] = [
  { href: '/member', label: '홈', isActive: (p) => p === '/member' },
  {
    href: '/member/posts',
    label: '블로그',
    isActive: (p) => p.startsWith('/member/posts') || p === '/member/write',
  },
  {
    href: '/member/projects',
    label: '프로젝트',
    isActive: (p) => p.startsWith('/member/projects'),
  },
  { href: '/member/profile', label: '프로필', isActive: (p) => p === '/member/profile' },
];

/**
 * 워크스페이스 상단 바 — 레이아웃(셸)에서 한 번만 렌더된다.
 * 화면마다 헤더를 각자 그리던 방식(누락·드리프트 위험)을 대체한다.
 */
export default function MemberTopBar() {
  const pathname = usePathname();
  const member = useMemberSession();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          aria-label="멋쟁이사자처럼 경희대 홈"
          className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-8 w-auto shrink-0 object-contain" />
          <span className="hidden truncate text-sm font-semibold text-white/70 sm:block">
            멤버 공간
          </span>
        </Link>

        <nav aria-label="멤버 공간" className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <MemberNavLink key={item.href} href={item.href} active={item.isActive(pathname)}>
              {item.label}
            </MemberNavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {member?.name ? (
            <span className="hidden text-sm text-white/45 md:inline">{member.name} 님</span>
          ) : null}
          <Link
            href={`/member/login?returnTo=${encodeURIComponent(pathname)}`}
            className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 text-xs text-white/55 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            계정 전환
          </Link>
        </div>
      </div>

      {/* 모바일 전용: 아래 줄에 가로 스크롤 가능한 네비 알약. */}
      <nav
        aria-label="멤버 공간"
        className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 sm:hidden"
      >
        {NAV.map((item) => (
          <MemberNavLink key={item.href} href={item.href} active={item.isActive(pathname)}>
            {item.label}
          </MemberNavLink>
        ))}
      </nav>
    </header>
  );
}

function MemberNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/[0.05] hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}
