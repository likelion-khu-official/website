'use client';

import { useEffect } from 'react';
import type { Member } from '@shared/types/member';
import { ROLE_LABELS, ROLE_ORDER, isStaffMember } from '@/lib/roster';
import { useMemberModal } from '@/components/members/MemberModalProvider';

// 대표 역할(가장 높은 서열)의 라벨. 겸직이면 제일 높은 것 하나만 보여준다.
function primaryRoleLabel(member: Member): string | null {
  if (member.roles.length === 0) return null;
  const top = [...member.roles].sort(
    (left, right) => ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
  )[0];
  return ROLE_LABELS[top];
}

type Props = {
  memberId: number;
  // 저장된 링크 텍스트(예: "@홍길동"). 해석 실패 시 이걸 평문으로 보여준다.
  fallback: string;
};

// 블로그 본문의 `[@이름](mention:id)`를 렌더한다.
// id가 현재 공개 멤버로 해석되면 색 있는 칩(+호버카드+클릭 모달), 아니면 평문으로 degrade한다.
export default function MemberMention({ memberId, fallback }: Props) {
  const { resolveMember, ensureDirectory, openMember } = useMemberModal();

  useEffect(() => {
    ensureDirectory();
  }, [ensureDirectory]);

  const member = resolveMember(memberId);

  // 로드 전이거나(잠깐) 실제 멤버로 해석 안 됨(비공개·오프보딩·없는 id) → 평문으로.
  if (!member) {
    return <span className="text-white/70">{fallback}</span>;
  }

  const staff = isStaffMember(member);
  const roleLabel = primaryRoleLabel(member);

  return (
    <span className="group relative inline-flex align-baseline">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${member.name}님${staff ? ' (운영진)' : ''} 소개 보기`}
        onClick={(event) =>
          openMember(member, { originRect: event.currentTarget.getBoundingClientRect() })
        }
        className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/[0.12] px-1.5 py-0.5 align-baseline text-[0.95em] font-medium leading-none text-accent outline-none transition-colors hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          aria-hidden
          className="flex size-[1.25em] items-center justify-center overflow-hidden rounded-full bg-white/10 text-[0.7em] leading-none"
        >
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            member.emoji ?? '🦁'
          )}
        </span>
        {member.name}
      </button>

      {/* 호버/포커스 미니카드 — 사진 + 이름 + 직책 + 운영진 여부 */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 group-hover:block group-focus-within:block"
      >
        <span className="flex w-max max-w-[240px] items-center gap-3 rounded-2xl border border-white/12 bg-[#161616] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.55)]">
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-xl">
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              member.emoji ?? '🦁'
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-white">{member.name}</span>
              {staff ? (
                <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  운영진
                </span>
              ) : null}
            </span>
            {roleLabel ? (
              <span className="mt-0.5 block truncate text-xs text-white/50">{roleLabel}</span>
            ) : null}
          </span>
        </span>
      </span>
    </span>
  );
}
