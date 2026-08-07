'use client';

import type { Member } from '@shared/types/member';
import { getMyProfile } from '@/lib/memberApi';
import { useMemberResource } from '@/components/member/hooks/useMemberResource';
import PageHeader from '@/components/member/ui/PageHeader';
import { Skeleton } from '@/components/member/ui/MemberSkeleton';
import { cardSurface, secondaryButton } from '@/components/member/ui/styles';
import MemberProfileForm from './MemberProfileForm';

export default function MemberProfileEditor() {
  const { data: profile, loading, error, reload } = useMemberResource<Member>(() => getMyProfile());

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Profile"
        title="프로필 편집"
        description="사진과 입부계기만 직접 바꿀 수 있어요. 이름·역할·기수는 관리자가 관리해요."
      />

      {loading ? (
        <Skeleton className="mt-12 h-96" />
      ) : error ? (
        <div className={`mt-12 flex min-h-72 flex-col items-center justify-center ${cardSurface} px-6 text-center`}>
          <p className="text-lg font-semibold text-white">{error}</p>
          <button type="button" onClick={reload} className={`mt-5 ${secondaryButton}`}>
            다시 시도
          </button>
        </div>
      ) : profile ? (
        <MemberProfileForm profile={profile} />
      ) : null}
    </div>
  );
}
