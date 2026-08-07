import type { ReactNode } from 'react';

type Props = {
  /** 영문 키커(예: "Blog"). accent 컬러 소문자→대문자 트래킹. */
  kicker: string;
  title: string;
  description?: string;
  /** 우측 정렬 액션(주로 주요 CTA 버튼/링크). */
  action?: ReactNode;
};

/**
 * 멤버 화면 상단 공통 헤더 — 키커·제목·설명·(선택)액션.
 * 모든 워크스페이스 화면이 같은 위계·간격을 쓰도록 한 곳으로 모았다.
 */
export default function PageHeader({ kicker, title, description, action }: Props) {
  return (
    <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-10">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{kicker}</p>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
