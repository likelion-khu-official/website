'use client';

import { useEffect, useRef, useState } from 'react';
import type { Member } from '@shared/types/member';
import type { ProjectParticipant } from '@shared/types/project';
import { ROLE_LABELS, cardColor } from '@/lib/roster';
import { useMemberModal } from '@/components/members/MemberModalProvider';

type Props = {
  participant: ProjectParticipant;
  member?: Member;
};

export default function ProjectMakerCard({ participant, member }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const photoUrl = member?.photoUrl ?? null;
  const { openMember } = useMemberModal();

  useEffect(() => {
    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth === 0) setImageFailed(true);
  }, [photoUrl]);

  const avatar = (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
      {photoUrl && !imageFailed ? (
        // 공개 멤버 프로필에 등록된 사진을 그대로 사용한다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={photoUrl}
          alt={`${participant.name} 프로필`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-base" role="img" aria-label={`${participant.name} 프로필 대체 이미지`}>
          {member?.emoji ?? '🦁'}
        </span>
      )}
    </div>
  );

  const text = (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-white">{participant.name}</p>
      <p className="mt-0.5 truncate text-[11px] text-white/40">{ROLE_LABELS[participant.part]}</p>
    </div>
  );

  // 로스터에 있는(=공개 프로필이 있는) 참여자만 눌러서 소개 모달을 연다.
  // 명단에 없는 참여자(비공개 등)는 기존처럼 정적으로 둔다.
  if (member) {
    return (
      <li className="min-w-0">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${participant.name}님 소개 보기`}
          onClick={(event) =>
            openMember(member, {
              accent: cardColor(Math.abs(member.id)),
              originRect: event.currentTarget.getBoundingClientRect(),
            })
          }
          className="flex w-full min-w-0 items-center gap-2.5 rounded-xl py-2 pr-2 text-left outline-none transition-colors hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-accent"
        >
          {avatar}
          {text}
        </button>
      </li>
    );
  }

  return (
    <li className="flex min-w-0 items-center gap-2.5 py-2">
      {avatar}
      {text}
    </li>
  );
}
