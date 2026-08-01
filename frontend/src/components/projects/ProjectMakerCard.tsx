'use client';

import { useEffect, useRef, useState } from 'react';
import type { Member } from '@shared/types/member';
import type { ProjectParticipant } from '@shared/types/project';
import { ROLE_LABELS } from '@/lib/roster';

type Props = {
  participant: ProjectParticipant;
  member?: Member;
};

export default function ProjectMakerCard({ participant, member }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const photoUrl = member?.photoUrl ?? null;

  useEffect(() => {
    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth === 0) setImageFailed(true);
  }, [photoUrl]);

  return (
    <li className="flex min-w-0 items-center gap-2.5 py-2">
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
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{participant.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-white/40">{ROLE_LABELS[participant.part]}</p>
      </div>
    </li>
  );
}
