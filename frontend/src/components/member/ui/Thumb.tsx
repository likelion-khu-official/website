import type { ReactNode } from 'react';

type Props = {
  src?: string | null;
  /** 이미지가 없을 때 가운데 표시할 대체물(주로 제목 모노그램). 그라디언트 placeholder를 쓰지 않는다. */
  fallback: ReactNode;
  /** 블로그 썸네일은 cover(꽉 채움), 프로젝트 이미지는 contain(원본 비율 유지). */
  fit?: 'cover' | 'contain';
  /** 크기·반경 등은 호출부에서 className으로 지정(예: 'h-16 w-16'). */
  className?: string;
};

/** 관리 목록 행의 작은 썸네일 — 이미지가 없으면 담백한 표면 위 모노그램으로 대체한다. */
export default function Thumb({ src, fallback, fit = 'cover', className = '' }: Props) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
        />
      ) : (
        <span aria-hidden className="font-semibold text-white/25">
          {fallback}
        </span>
      )}
    </div>
  );
}
