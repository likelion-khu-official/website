'use client';

import type { Member } from '@shared/types/member';
import type { ActivitiesByMember } from '@/lib/memberActivity';
import { cardColor } from '@/lib/roster';
import MemberCard from './MemberCard';
import { useMemberModal } from './MemberModalProvider';

type Props = {
  members: Member[];
  // memberId → 공개 블로그 글과 참여 프로젝트를 합친 최신순 활동.
  activitiesByMember: ActivitiesByMember;
  // 글·프로젝트 중 한 소스라도 실패하면 현재 목록이 일부일 수 있음을 모달에서 알린다.
  activitiesIncomplete?: boolean;
};

export default function MemberRoster({
  members,
  activitiesByMember,
  activitiesIncomplete,
}: Props) {
  // 상세 모달은 전역 provider(MemberModalProvider)가 소유한다 — /members뿐 아니라
  // 프로젝트·블로그 등 사람이 나오는 어디서든 같은 모달을 열기 위해서다.
  const { openMember } = useMemberModal();

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-[38px] sm:gap-y-[38px] md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {members.map((member, index) => (
        <MemberCard
          key={member.id}
          member={member}
          colorIndex={index}
          onSelect={(selected, rect) =>
            openMember(selected, {
              // 카드 색·활동은 로스터가 이미 아니 넘겨서 지연 로드를 건너뛴다.
              accent: cardColor(index),
              originRect: rect,
              activities: activitiesByMember[selected.id] ?? [],
              activitiesIncomplete,
            })
          }
        />
      ))}
    </div>
  );
}
