'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { MemberAccount } from '@shared/types/member-auth';
import { MemberApiError, getCurrentMember, logout } from '@/lib/memberApi';

const PUBLIC_MEMBER_PATHS = ['/member/login', '/member/forgot-password'];

const NAV_ITEMS = [
  { href: '/member', label: '홈', isCurrent: (pathname: string) => pathname === '/member' },
  {
    href: '/member/posts',
    label: '내 글',
    isCurrent: (pathname: string) =>
      pathname.startsWith('/member/posts') || pathname === '/member/write',
  },
  {
    href: '/member/projects',
    label: '내 프로젝트',
    isCurrent: (pathname: string) => pathname.startsWith('/member/projects'),
  },
  {
    href: '/member/profile',
    label: '프로필',
    isCurrent: (pathname: string) => pathname.startsWith('/member/profile'),
  },
] as const;

export function isPublicMemberPath(pathname: string) {
  return PUBLIC_MEMBER_PATHS.includes(pathname);
}

// 로그인한 본인 정보 — MemberShell이 한 번만 불러와서 하위 화면에 공급한다(#287).
// 각 화면이 따로 getCurrentMember()를 불러 인증 가드를 중복 구현하던 걸 정리했다.
const MemberSessionContext = createContext<MemberAccount | null>(null);

export function useMemberSession(): MemberAccount {
  const member = useContext(MemberSessionContext);
  if (!member) {
    throw new Error('useMemberSession은 MemberShell 하위(보호된 화면)에서만 쓸 수 있어요.');
  }
  return member;
}

interface MemberShellProps {
  children: React.ReactNode;
}

function MemberNavigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="멤버 공간" className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
      {NAV_ITEMS.map((item) => {
        const current = item.isCurrent(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            onClick={onNavigate}
            className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-none sm:px-4 ${
              current ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ProtectedMemberShell({ children, pathname }: MemberShellProps & { pathname: string }) {
  const router = useRouter();

  const [member, setMember] = useState<MemberAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  // 진입 시점 경로를 한 번만 잡아둔다 — 세션 체크 effect는 재시도 때만 다시 돌아서(아래 deps)
  // pathname을 그 deps에 넣으면 매 내비게이션마다 세션을 다시 불러오게 된다. 세션 만료로 로그인
  // 화면으로 보낼 때 "원래 가려던 곳"은 이 첫 진입 경로면 충분하다.
  const [returnTo] = useState(pathname);

  useEffect(() => {
    let cancelled = false;

    getCurrentMember()
      .then(({ member: currentMember }) => {
        if (cancelled) return;
        if (currentMember.mustChangePassword) {
          router.replace(`/member/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        setMember(currentMember);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof MemberApiError && error.status === 401) {
          router.replace(`/member/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        setLoadError(
          error instanceof MemberApiError ? error.message : '로그인 상태를 확인하지 못했어요.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryIndex, router, returnTo]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // 서버 응답과 무관하게 브라우저에서는 보호 화면을 떠난다 — 쿠키가 이미 지워지지
      // 않았더라도 클라이언트 상태만은 로그아웃된 것처럼 되돌릴 수 없게 한다.
    } finally {
      router.push('/member/login');
      router.refresh();
      setLoggingOut(false);
    }
  }

  if (loading || (!member && !loadError)) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-6xl items-center justify-center">
        <p role="status" aria-live="polite" className="text-sm text-white/45">
          멤버 화면을 준비하고 있어요…
        </p>
      </div>
    );
  }

  if (loadError || !member) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-6xl flex-col items-center justify-center gap-4 text-center">
        <p role="alert" className="text-sm text-white/45">
          {loadError || '로그인 상태를 확인하지 못했어요.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setLoadError('');
            setRetryIndex((value) => value + 1);
          }}
          className="min-h-11 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <MemberSessionContext.Provider value={member}>
      <a
        href="#member-main"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black outline-none transition-transform focus:translate-y-0 focus:ring-2 focus:ring-accent"
      >
        본문으로 바로가기
      </a>

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

        <MemberNavigation pathname={pathname} />

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-white/45 sm:inline">{member.name} 님</span>
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 text-xs text-white/55 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-50"
          >
            {loggingOut ? '로그아웃 중…' : '로그아웃'}
          </button>
        </div>
      </header>

      <main id="member-main" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </MemberSessionContext.Provider>
  );
}

export default function MemberShell({ children }: MemberShellProps) {
  const pathname = usePathname();

  if (isPublicMemberPath(pathname)) {
    return <>{children}</>;
  }

  return <ProtectedMemberShell pathname={pathname}>{children}</ProtectedMemberShell>;
}
