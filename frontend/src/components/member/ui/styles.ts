// 멤버 워크스페이스 공용 클래스 문자열.
// 버튼·입력·표면(surface)을 한 곳에서 관리해 화면 간 드리프트를 막는다.
// 색·모션은 토큰(var(--accent) 등)을 그대로 쓰는 Tailwind 유틸리티로 표현한다.

export const primaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-[#ff6a26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40';

export const secondaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40';

export const ghostButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40';

export const inputField =
  'min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60';

// 카드·패널 공통 표면.
export const cardSurface = 'rounded-3xl border border-white/10 bg-white/[0.025]';
