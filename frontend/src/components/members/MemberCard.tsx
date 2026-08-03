'use client';

import { useEffect, useRef, useState } from 'react';
import type { Member, MemberRole } from '@shared/types/member';
import { ROLE_LABELS, cardColor } from '@/lib/roster';

const ROLE_ORDER: MemberRole[] = [
  'PRESIDENT', 'VICE_PRESIDENT',
  'BACKEND_LEAD', 'FRONTEND_LEAD', 'DESIGN_LEAD', 'AI_LEAD',
  'PLANNING_HEAD', 'PLANNING_MEMBER',
  'PR_HEAD', 'PR_MEMBER',
  'BACKEND', 'FRONTEND', 'DESIGN', 'AI',
];

function TrackMark({ role }: { role: MemberRole }) {
  const props = {
    viewBox: '0 0 18 18',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-[18px] w-[18px]',
    'aria-hidden': true,
  };

  switch (role) {
    case 'BACKEND':
    case 'BACKEND_LEAD':
      return (
        <svg {...props}>
          <ellipse cx="7" cy="4.5" rx="4.2" ry="2" />
          <path d="M2.8 4.5v5c0 1.1 1.9 2 4.2 2s4.2-.9 4.2-2v-5M2.8 7c0 1.1 1.9 2 4.2 2s4.2-.9 4.2-2M11.2 8.2h2.1c1 0 1.8.8 1.8 1.8v1.2" />
          <rect x="13.2" y="11.2" width="3.2" height="3.2" rx=".8" />
        </svg>
      );
    case 'AI':
    case 'AI_LEAD':
      return (
        <svg {...props}>
          <path d="m9 3 1.1 4 3.9 1.1-3.9 1.1-1.1 4-1.1-4L4 8.1 7.9 7 9 3Z" />
          <circle cx="3" cy="3.2" r="1" />
          <circle cx="15" cy="4" r="1" />
          <circle cx="14.5" cy="14.5" r="1" />
          <path d="m3.8 3.9 2.4 2M14.1 4.8l-2.3 1.6M13.8 13.7l-2.2-2.2" />
        </svg>
      );
    case 'FRONTEND':
    case 'FRONTEND_LEAD':
      return (
        <svg {...props}>
          <rect x="1.7" y="2.5" width="14.6" height="13" rx="2.5" />
          <path d="M1.7 6h14.6M7 8.5l-2.2 2L7 12.5M11 8.5l2.2 2-2.2 2" />
        </svg>
      );
    case 'DESIGN':
    case 'DESIGN_LEAD':
      return (
        <svg {...props}>
          <circle cx="3" cy="4" r="1.2" />
          <circle cx="15" cy="4" r="1.2" />
          <circle cx="9" cy="14.5" r="1.2" />
          <path d="M4.2 4h3M10.8 4h3M3 5.2c.7 4.7 2.4 7.7 4.8 8.8M15 5.2c-.7 4.7-2.4 7.7-4.8 8.8M7.5 2.8h3v2.4h-3z" />
        </svg>
      );
    default:
      // PRESIDENT, VICE_PRESIDENT, PLANNING_*, PR_*
      return (
        <svg {...props}>
          <circle cx="9" cy="9" r="7" />
          <path d="m11.7 6.3-1.6 3.8-3.8 1.6 1.6-3.8 3.8-1.6Z" />
        </svg>
      );
  }
}

export default function MemberCard({
  member,
  colorIndex,
  onSelect,
}: {
  member: Member;
  colorIndex: number;
  onSelect: (member: Member) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [lastPhotoUrl, setLastPhotoUrl] = useState(member.photoUrl);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (member.photoUrl !== lastPhotoUrl) {
    setLastPhotoUrl(member.photoUrl);
    setImgError(false);
  }

  // 이 img는 loading 속성이 없어(=브라우저 기본값 eager) 하이드레이션 전에 요청이
  // 시작될 수 있다. error는 버블링 안 하는 이벤트라 그 전에 실패하면 onError가
  // 유실되므로, 마운트 시 네이티브 로드 상태를 한 번 더 확인해 놓친 실패를 보정한다.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImgError(true);
    }
  }, [member.photoUrl]);

  const roles = [...member.roles].sort(
    (left, right) => ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
  );
  const primaryRole = roles[0] ?? 'BACKEND';
  const [backgroundColor, color] = cardColor(colorIndex);

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${member.name}님 소개와 참여 프로젝트 보기`}
      data-track={primaryRole}
      onClick={() => onSelect(member)}
      className="group relative aspect-[156/189] h-auto w-full max-w-[156px] cursor-pointer justify-self-center overflow-hidden rounded-[clamp(18px,5.5vw,22px)] text-left outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none"
      style={{ backgroundColor, color }}
    >
      <span className="sr-only">{ROLE_LABELS[primaryRole]} 트랙</span>

      {/* 세션 구분 표시 — 위치·표현 그대로 유지(#309 범위 밖: 변경 금지) */}
      <span className="absolute right-[9%] top-[7.4%]">
        <TrackMark role={primaryRole} />
      </span>

      <span className="absolute left-1/2 top-[39.7%] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        {member.photoUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={member.photoUrl}
            alt=""
            className="h-[clamp(56px,18vw,66px)] w-[clamp(56px,18vw,66px)] rounded-full border-[3px] border-white object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="select-none text-[clamp(48px,16vw,58px)] leading-none" aria-hidden>
            {member.emoji}
          </span>
        )}
      </span>

      <span className="absolute inset-x-3 bottom-[11.6%] truncate text-center text-[clamp(24px,8vw,29px)] font-bold leading-[1.16] tracking-[-0.075em]">
        {member.name}
      </span>
    </button>
  );
}
