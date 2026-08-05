'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { MemberAccount } from '@shared/types/member-auth';
import type { Member } from '@shared/types/member';
import { getCurrentMember, getMyProfile, MemberApiError } from '@/lib/memberApi';
import MemberProjectHeader from '@/components/member/projects/MemberProjectHeader';
import MemberProfileForm from './MemberProfileForm';

export default function MemberProfileEditor() {
  const router = useRouter();
  const pathname = usePathname();
  const [account, setAccount] = useState<MemberAccount | null>(null);
  const [profile, setProfile] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ member: currentMember }, myProfile] = await Promise.all([
        getCurrentMember(),
        getMyProfile(),
      ]);
      if (currentMember.mustChangePassword) {
        router.replace(`/member/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setAccount(currentMember);
      setProfile(myProfile);
    } catch (loadError) {
      if (loadError instanceof MemberApiError && loadError.status === 401) {
        router.replace(`/member/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setError(loadError instanceof Error ? loadError.message : '프로필을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <MemberProjectHeader memberName={account?.name} />
      <div className="border-b border-white/10 pb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Profile
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
          프로필 편집
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/45">
          사진과 입부계기만 직접 바꿀 수 있어요. 이름·역할·기수는 관리자가 관리해요.
        </p>
      </div>

      {loading ? (
        <div className="mt-12 h-96 animate-pulse rounded-3xl border border-white/5 bg-white/[0.035]" />
      ) : error ? (
        <div className="mt-12 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025] px-6 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 min-h-11 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            다시 시도
          </button>
        </div>
      ) : profile ? (
        <MemberProfileForm profile={profile} />
      ) : null}
    </div>
  );
}
