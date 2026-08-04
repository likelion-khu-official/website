'use client';

import { useState } from 'react';
import type { Member } from '@shared/types/member';
import type { ProjectSummary } from '@shared/types/project';
import { cardColor } from '@/lib/roster';
import MemberCard from './MemberCard';
import MemberDetailModal from './MemberDetailModal';

type Props = {
  members: Member[];
  // memberId → 그 멤버가 참여한 프로젝트 목록. 서버에서 공개 API로 집계해 내려준다.
  projectsByMember: Record<number, ProjectSummary[]>;
  // 프로젝트 집계 자체가 실패한 경우(멤버 목록은 그대로 보여주되 모달에서 안내).
  projectsUnavailable?: boolean;
};

export default function MemberRoster({ members, projectsByMember, projectsUnavailable }: Props) {
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
        projects={selected ? (projectsByMember[selected.id] ?? []) : []}
        projectsUnavailable={projectsUnavailable}
        onClose={() => setSelectedIndex(null)}
      />
    </>
  );
}
