'use client';

import { useState } from 'react';
import type { Member } from '@shared/types/member';
import type { ActivitiesByMember } from '@/lib/memberActivity';
import { cardColor } from '@/lib/roster';
import MemberCard from './MemberCard';
import MemberDetailModal from './MemberDetailModal';

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
  // 선택을 인덱스로 잡아 모달이 카드와 같은 색(cardColor)을 악센트로 쓸 수 있게 한다.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? null : members[selectedIndex];

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-[38px] sm:gap-y-[38px] md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {members.map((member, index) => (
          <MemberCard
            key={member.id}
            member={member}
            colorIndex={index}
            onSelect={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      <MemberDetailModal
        member={selected}
        accent={selectedIndex === null ? undefined : cardColor(selectedIndex)}
        activities={selected ? (activitiesByMember[selected.id] ?? []) : []}
        activitiesIncomplete={activitiesIncomplete}
        onClose={() => setSelectedIndex(null)}
      />
    </>
  );
}
