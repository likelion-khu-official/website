'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminApiError, logout, refreshSession } from '@/lib/adminApi';
import type { AdminAccount } from '@shared/types/admin';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password'];
const PUBLIC_ADMIN_PREFIXES = ['/admin/invite/', '/admin/reset-password/'];

const NAV_GROUPS = [
  {
    label: '운영',
    items: [
      { href: '/admin', label: '이용 현황' },
      { href: '/admin/members', label: '멤버 관리' },
      { href: '/admin/staff', label: '운영진 소개' },
      { href: '/admin/admins', label: '관리자 계정' },
    ],
  },
  {
    label: '모집',
    items: [
      { href: '/admin/recruitment', label: '모집 관리' },
      { href: '/admin/applications', label: '지원자' },
      { href: '/admin/application-form', label: '지원서 양식' },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      { href: '/admin/blog', label: '블로그 관리' },
      { href: '/admin/comments', label: '댓글 검열' },
    ],
  },
  {
    label: '보안',
    items: [{ href: '/admin/audit-logs', label: '감사 로그' }],
  },
] as const;

interface AdminShellProps {
  children: React.ReactNode;
}

export function isPublicAdminPath(pathname: string) {
  return (
    PUBLIC_ADMIN_PATHS.includes(pathname) ||
    PUBLIC_ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isCurrentPath(pathname: string, href: string) {
  if (href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavigation({
  pathname,
  onNavigate,
  labelledBy,
}: {
  pathname: string;
  onNavigate?: () => void;
  labelledBy: string;
}) {
  return (
    <nav aria-labelledby={labelledBy} className="space-y-5">
      <h2 id={labelledBy} className="sr-only">
        어드민 주요 메뉴
      </h2>
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const current = isCurrentPath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    onClick={onNavigate}
                    className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                      current
                        ? 'bg-white text-black'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AdminIdentity({
  admin,
  loggingOut,
  onLogout,
}: {
  admin: AdminAccount;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="min-w-0 border-t border-white/10 pt-4">
      <p className="truncate text-sm font-medium text-white">{admin.name}</p>
      <p className="truncate text-xs text-white/45">{admin.email}</p>
      <button
        type="button"
        disabled={loggingOut}
        onClick={onLogout}
        className="mt-3 min-h-11 w-full rounded-xl border border-white/15 px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-50"
      >
        {loggingOut ? '로그아웃 중…' : '로그아웃'}
      </button>
    </div>
  );
}

function ProtectedAdminShell({
  children,
  pathname,
}: AdminShellProps & {
  pathname: string;
}) {
  const router = useRouter();

  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    refreshSession()
      .then((session) => {
        if (!cancelled) setAdmin(session.admin);
      })
      .catch((error) => {
        if (cancelled) return;
        if (
          error instanceof AdminApiError &&
          (error.status === 401 ||
            error.code === 'UNAUTHENTICATED' ||
            error.code === 'INVALID_REFRESH_TOKEN')
        ) {
          router.replace('/admin/login');
          return;
        }
        setAdmin(null);
        setLoadError(
          error instanceof AdminApiError ? error.message : '관리자 정보를 불러오지 못했어요.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryIndex, router]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // 서버 응답과 무관하게 브라우저에서 보호 화면을 떠난다.
    } finally {
      router.push('/admin/login');
      router.refresh();
      setLoggingOut(false);
    }
  }

  if (loading || (!admin && !loadError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <p role="status" aria-live="polite" className="text-sm text-muted">
          관리자 화면을 준비하고 있어요…
        </p>
      </div>
    );
  }

  if (loadError || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <p role="alert" className="text-sm text-muted">
            {loadError || '관리자 정보를 불러오지 못했어요.'}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#admin-main"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black outline-none transition-transform focus:translate-y-0 focus:ring-2 focus:ring-accent"
      >
        본문으로 바로가기
      </a>

      <div className="mx-auto flex min-h-screen w-full max-w-[100rem] flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-black/20 p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <Link
            href="/admin"
            className="mb-8 rounded-lg text-sm font-semibold tracking-wide text-white outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            LIKELION KHU <span className="text-accent">ADMIN</span>
          </Link>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AdminNavigation pathname={pathname} labelledBy="desktop-admin-nav" />
          </div>
          <AdminIdentity admin={admin} loggingOut={loggingOut} onLogout={handleLogout} />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-white/10 bg-black/20 px-4 py-3 lg:hidden">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="min-w-0 truncate rounded-lg text-sm font-semibold tracking-wide text-white outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                LIKELION KHU <span className="text-accent">ADMIN</span>
              </Link>
              <button
                type="button"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-admin-menu"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="min-h-11 shrink-0 rounded-xl border border-white/15 px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent"
              >
                {mobileMenuOpen ? '메뉴 닫기' : '메뉴'}
              </button>
            </div>

            <div
              id="mobile-admin-menu"
              className={`${mobileMenuOpen ? 'block' : 'hidden'} border-t border-white/10 pb-2 pt-4`}
            >
              <AdminNavigation
                pathname={pathname}
                labelledBy="mobile-admin-nav"
                onNavigate={() => setMobileMenuOpen(false)}
              />
              <div className="mt-5">
                <AdminIdentity admin={admin} loggingOut={loggingOut} onLogout={handleLogout} />
              </div>
            </div>
          </header>

          <main id="admin-main" tabIndex={-1} className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  if (isPublicAdminPath(pathname)) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <main className="flex-1 px-5 py-8 sm:px-10 sm:py-10">{children}</main>
      </div>
    );
  }

  return <ProtectedAdminShell pathname={pathname}>{children}</ProtectedAdminShell>;
}
