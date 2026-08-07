'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { MemberAccount } from '@shared/types/member-auth';
import { getCurrentMember, MemberApiError } from '@/lib/memberApi';
import { MemberSessionProvider } from '../hooks/memberSession';
import MemberSidebar from './MemberSidebar';
import { MemberBottomNav, MemberMobileHeader } from './MemberMobileNav';

/**
 * 헤더·네비 없이 자체 레이아웃을 갖는 화면들.
 * 로그인·비번찾기는 미인증, 글쓰기·글수정(WriteForm)은 집중 작성용 풀스크린 에디터라
 * 워크스페이스 크롬을 얹지 않는다.
 */
const BARE_ROUTES = new Set(['/member/login', '/member/forgot-password', '/member/write']);
const BARE_PATTERNS = [/^\/member\/posts\/\d+\/edit$/];

function isBareRoute(pathname: string) {
  return BARE_ROUTES.has(pathname) || BARE_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * 멤버 영역 셸 — member/layout에서 children을 감싼다.
 * 워크스페이스 경로에는 상단 바 + 공통 컨테이너를 한 번만 씌우고,
 * 세션(/auth/me)을 한 번 조회해 컨텍스트로 내려준다.
 */
export default function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isBareRoute(pathname)) {
    return <main className="px-5 py-8 sm:px-10 sm:py-10">{children}</main>;
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [member, setMember] = useState<MemberAccount | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { member: current } = await getCurrentMember();
        if (cancelled) return;
        if (current.mustChangePassword) {
          router.replace(`/member/login?returnTo=${encodeURIComponent(pathname)}`);
          return;
        }
        setMember(current);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof MemberApiError && err.status === 401) {
          router.replace(`/member/login?returnTo=${encodeURIComponent(pathname)}`);
        }
        // 그 외 오류는 헤더 이름만 비운다 — 각 화면이 자체 데이터 로딩에서 에러를 표시한다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return (
    <MemberSessionProvider member={member}>
      <div className="min-h-[100svh]">
        <MemberSidebar />
        <div className="lg:pl-60">
          <MemberMobileHeader />
          <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-8 sm:px-8 sm:pt-12 lg:pb-16 lg:pt-14">
            {children}
          </main>
        </div>
        <MemberBottomNav />
      </div>
    </MemberSessionProvider>
  );
}
