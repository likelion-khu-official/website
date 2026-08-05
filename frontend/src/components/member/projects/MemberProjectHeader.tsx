'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  memberName?: string;
};

export default function MemberProjectHeader({ memberName }: Props) {
  const pathname = usePathname();
  const homeActive = pathname === '/member';
  const projectActive = pathname.startsWith('/member/projects');
  const postActive = pathname.startsWith('/member/posts') || pathname === '/member/write';
  const profileActive = pathname === '/member/profile';

  return (
    <header className="mx-auto mb-10 flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-3 sm:mb-14">
      <Link
        href="/"
        aria-label="멋쟁이사자처럼 경희대 홈"
        className="flex min-h-11 min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-auto shrink-0 object-contain" />
        <span className="hidden truncate text-sm font-semibold text-white/65 sm:block">
          멤버 공간
        </span>
      </Link>
      <nav aria-label="멤버 공간" className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
        <MemberNavLink href="/member" active={homeActive}>
          홈
        </MemberNavLink>
        <MemberNavLink href="/member/posts" active={postActive}>
          블로그
        </MemberNavLink>
        <MemberNavLink href="/member/projects" active={projectActive}>
          프로젝트
        </MemberNavLink>
        <MemberNavLink href="/member/profile" active={profileActive}>
          프로필
        </MemberNavLink>
      </nav>
      <div className="flex items-center gap-3">
        {memberName ? (
          <span className="hidden text-sm text-white/45 sm:inline">{memberName} 님</span>
        ) : null}
        <Link
          href={`/member/login?returnTo=${encodeURIComponent(pathname)}`}
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 text-xs text-white/55 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          계정 전환
        </Link>
      </div>
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
      className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-none sm:px-4 ${
        active ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}
