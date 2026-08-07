import type { ReactNode } from 'react';
import type { MemberPostSummary } from '@shared/types/feed';

type Tone = 'positive' | 'warning' | 'neutral';

const toneClass: Record<Tone, string> = {
  positive: 'bg-emerald-400/10 text-emerald-300',
  warning: 'bg-amber-400/10 text-amber-300',
  neutral: 'bg-white/10 text-white/55',
};

export default function StatusBadge({
  tone,
  children,
  className = '',
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** 글 상태(공개/숨김/초안)를 일관된 배지로. */
export function PostStatusBadge({ status }: { status: MemberPostSummary['status'] }) {
  if (status === 'PUBLISHED') return <StatusBadge tone="positive">공개</StatusBadge>;
  if (status === 'HIDDEN') return <StatusBadge tone="warning">숨김</StatusBadge>;
  return <StatusBadge tone="neutral">초안</StatusBadge>;
}

/** 프로젝트 공개 여부를 일관된 배지로. */
export function ProjectVisibilityBadge({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <StatusBadge tone="warning">숨김</StatusBadge>
  ) : (
    <StatusBadge tone="positive">공개</StatusBadge>
  );
}
