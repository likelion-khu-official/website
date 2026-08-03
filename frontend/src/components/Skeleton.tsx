import type { CSSProperties } from 'react';

/**
 * 로딩 자리표시(스켈레톤) 프리미티브.
 *
 * - 서버·클라이언트 컴포넌트 어디서나 쓸 수 있게 훅 없는 순수 div다(loading.tsx에서 바로 사용).
 * - 배경 톤은 `tone`으로 고른다 — 한 요소에 두 개의 bg 유틸이 겹치면 Tailwind 정렬
 *   순서에 따라 어느 쪽이 이길지 예측이 어렵기 때문에, 톤은 프리미티브가 단독으로 정한다.
 * - 모양(radius·크기·비율)은 className으로 준다. 기본 radius는 `rounded-md`이고,
 *   `rounded-full`·`rounded-xl`·`rounded-2xl`·`rounded-3xl`은 Tailwind에서 md보다 뒤에
 *   생성돼 className으로 덮어쓸 수 있다.
 * - prefers-reduced-motion에서는 무한 펄스를 끄고 정적인 자리표시만 남긴다(접근성).
 * - 순수 장식이라 스크린리더에서 숨긴다.
 */
type SkeletonTone = 'default' | 'strong' | 'faint';

const TONE_CLASS: Record<SkeletonTone, string> = {
  default: 'bg-white/[0.07]',
  strong: 'bg-white/10',
  faint: 'bg-white/[0.04]',
};

type SkeletonProps = {
  className?: string;
  tone?: SkeletonTone;
  style?: CSSProperties;
};

export default function Skeleton({ className = '', tone = 'default', style }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md motion-reduce:animate-none ${TONE_CLASS[tone]} ${className}`}
      style={style}
    />
  );
}
