'use client';

import { useState } from 'react';
import type { Member } from '@shared/types/member';
import type { ProjectSummary } from '@shared/types/project';
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
  const [selected, setSelected] = useState<Member | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 justify-center gap-x-3 gap-y-8 sm:grid-cols-[repeat(auto-fit,minmax(144px,156px))] sm:gap-x-[38px] sm:gap-y-[38px]">
        {members.map((member, index) => (
          <MemberCard key={member.id} member={member} colorIndex={index} onSelect={setSelected} />
        ))}
      </div>

      <MemberDetailModal
        member={selected}
        projects={selected ? (projectsByMember[selected.id] ?? []) : []}
        projectsUnavailable={projectsUnavailable}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
