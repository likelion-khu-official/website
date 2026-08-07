import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  /** 비어 있을 때 유도할 액션(주로 첫 생성 CTA). */
  action?: ReactNode;
};

/** 목록이 비었을 때의 점선 테두리 안내 표면. */
export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      {description ? <p className="mt-2 text-sm text-white/40">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
