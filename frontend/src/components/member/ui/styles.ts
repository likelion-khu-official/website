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

// 카드 안의 위험 액션(삭제 등) — 담백한 고스트, hover에서만 붉게.
export const dangerGhostButton =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm text-white/45 transition-colors hover:bg-red-400/[0.08] hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 disabled:opacity-40';

// 메타 태그 칩(기술 스택 등).
export const chip =
  'inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/55';

// 카드·패널 공통 표면.
export const cardSurface = 'rounded-3xl border border-white/10 bg-white/[0.025]';

// 리스트 카드 공통 표면 — hover 시 살짝 떠오른다(모션 감소 시 정지).
export const listCard =
  'group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/20 motion-reduce:transform-none motion-reduce:transition-none';

// 관리 목록의 한 줄(row) — 작은 썸네일 + 본문 + 액션. 모바일은 세로로 접혀 액션이 아래로,
// sm+에선 한 줄로 펼쳐지고 액션이 오른쪽에 붙는다. 큰 미디어 카드보다 밀도 높고 담백하다.
export const rowCard =
  'group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:gap-5';

// 행 안의 담백한 액션(수정·공개 보기 등). 터치 타깃은 유지하되 가로 패딩만 줄였다.
export const rowAction =
  'inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
