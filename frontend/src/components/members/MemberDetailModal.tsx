'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Member } from '@shared/types/member';
import type { MemberActivity } from '@/lib/memberActivity';
import { formatDate } from '@/lib/formatDate';
import { ROLE_LABELS } from '@/lib/roster';

type Accent = readonly [string, string]; // [배경색, 글자색] — 멤버 카드 색 쌍

type Props = {
  member: Member | null;
  // 선택한 멤버 카드의 색 쌍. 모달 전체 배경과 전경에 이어 써서 카드가 확장되는 느낌을 만든다.
  accent?: Accent;
  activities: MemberActivity[];
  // 블로그·프로젝트 중 일부를 못 불러오면 완전한 빈 상태와 구분해 안내한다.
  activitiesIncomplete?: boolean;
  onClose: () => void;
};

// 닫힘 애니메이션이 끝난 뒤 언마운트하기까지의 시간(ms). transition duration과 맞춘다.
const CLOSE_MS = 220;
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const FALLBACK_ACCENT: Accent = ['#ff8a3d', '#111111'];

function subscribeReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}
function getReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function ActivityVisual({ activity }: { activity: MemberActivity }) {
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const kindLabel = activity.kind === 'BLOG' ? 'BLOG' : 'PROJECT';

  // 하이드레이션 전에 이미지 요청이 실패해 onError가 유실된 경우까지 보정한다.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setImgError(true);
  }, [activity.imageUrl]);

  return (
    <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-black/30">
      {activity.imageUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={activity.imageUrl}
          alt={`${activity.title} 대표 이미지`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015] group-hover:opacity-90"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between bg-[radial-gradient(circle_at_75%_20%,rgba(255,80,0,0.22),transparent_38%),linear-gradient(145deg,#252525,#171717)] p-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            LIKELION KHU
          </span>
          <span className="text-4xl font-semibold tracking-[-0.06em] text-white/10" aria-hidden>
            {kindLabel}
          </span>
        </div>
      )}
    </div>
  );
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export default function MemberDetailModal({
  member,
  accent,
  activities,
  activitiesIncomplete = false,
  onClose,
}: Props) {
  const open = member !== null;
  const [prevOpen, setPrevOpen] = useState(open);
  const [shown, setShown] = useState(false); // 진입 애니메이션(scale/opacity) 토글
  const [closing, setClosing] = useState(false); // 닫힘 애니메이션 동안 마운트 유지
  // 닫히는 동안에도 내용을 그려야 하므로 마지막 선택 멤버·색·활동을 붙잡아 둔다.
  const [activeMember, setActiveMember] = useState<Member | null>(member);
  const [activeAccent, setActiveAccent] = useState<Accent>(accent ?? FALLBACK_ACCENT);
  const [activeActivities, setActiveActivities] = useState(activities);
  const [activeActivitiesIncomplete, setActiveActivitiesIncomplete] = useState(
    activitiesIncomplete,
  );
  const [index, setIndex] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<Element | null>(null);
  const pointerStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const headingId = useId();

  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const rendered = open || closing;

  // 프롭 변화에 맞춰 렌더 중 상태 조정(React 권장 — effect 안 setState 대신).
  if (open !== prevOpen) {
    setPrevOpen(open);
    setShown(false);
    setClosing(!open);
    if (open) {
      setActiveMember(member);
      setActiveAccent(accent ?? FALLBACK_ACCENT);
      setActiveActivities(activities);
      setActiveActivitiesIncomplete(activitiesIncomplete);
      setIndex(0);
    }
  }

  // 진입: 마운트된 다음 프레임에 보이기 상태로.
  useEffect(() => {
    if (!open) return;
    lastTriggerRef.current = document.activeElement;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // 닫힘 애니메이션이 끝나면 언마운트한다.
  useEffect(() => {
    if (open || !closing) return;
    const timer = setTimeout(() => setClosing(false), reducedMotion ? 0 : CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open, closing, reducedMotion]);

  // 떠 있는 동안 배경 스크롤 락 + ESC 닫기.
  useEffect(() => {
    if (!rendered) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rendered, onClose]);

  // 열리면 다이얼로그 안 첫 요소(닫기 버튼)로 포커스를 옮긴다.
  useEffect(() => {
    if (shown) {
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }
  }, [shown]);

  // 완전히 닫히면 원래 눌렀던 카드로 포커스를 되돌린다.
  useEffect(() => {
    if (!rendered && lastTriggerRef.current instanceof HTMLElement) {
      lastTriggerRef.current.focus();
    }
  }, [rendered]);

  const move = useCallback(
    (direction: -1 | 1) => {
      setIndex((current) => (
        (current + direction + activeActivities.length) % activeActivities.length
      ));
    },
    [activeActivities.length],
  );

  // Tab이 다이얼로그 밖으로 나가지 않게 가둔다(배경 포커스 차단). 좌우 화살표로 활동 이동.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' && activeActivities.length > 1) move(-1);
    if (event.key === 'ArrowRight' && activeActivities.length > 1) move(1);
    if (event.key !== 'Tab') return;

    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointerStart.current = event.clientX;
    swiped.current = false;
  }
  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerStart.current !== null && activeActivities.length > 1) {
      const distance = event.clientX - pointerStart.current;
      if (Math.abs(distance) > 48) {
        swiped.current = true;
        move(distance > 0 ? -1 : 1);
      }
    }
    pointerStart.current = null;
  }

  if (!rendered || !activeMember) return null;

  const [accentBg, accentFg] = activeAccent;
  const roleLabels = activeMember.roles.map((role) => ROLE_LABELS[role]).join(' · ');
  const activeActivity = activeActivities[index];
  const accentSurface = `color-mix(in srgb, ${accentFg} 12%, transparent)`;
  const accentBorder = `color-mix(in srgb, ${accentFg} 20%, transparent)`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      {/* 배경 딤 — 클릭하면 닫힘. 헤더(z-20)까지 덮는다. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="배경을 눌러 닫기"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm transition-opacity duration-200 ease-[var(--motion-ease-out)] motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={handleKeyDown}
        className={`relative max-h-[94svh] w-full overflow-y-auto overscroll-contain rounded-t-[36px] border shadow-[0_-24px_90px_rgba(0,0,0,0.5)] transition-all duration-200 ease-[var(--motion-ease-out)] will-change-transform motion-reduce:transition-none sm:max-w-[1180px] sm:rounded-[56px] sm:shadow-[0_30px_120px_rgba(0,0,0,0.65)] lg:min-h-[640px] ${
          shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95'
        }`}
        style={{ backgroundColor: accentBg, color: accentFg, borderColor: accentBorder }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-current motion-reduce:transition-none sm:right-6 sm:top-6"
          style={{ backgroundColor: accentSurface, borderColor: accentBorder }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        <div className="grid min-h-full gap-6 p-5 pb-7 pt-16 sm:gap-8 sm:p-8 sm:pt-20 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)] lg:gap-10 lg:p-12 xl:grid-cols-[minmax(0,1.4fr)_420px] xl:gap-12 xl:px-16">
          {/* 왼쪽 — 참고안처럼 큰 프로필과 소개를 멤버 카드 색 위에 배치한다. */}
          <section
            aria-label={`${activeMember.name} 소개`}
            className="flex min-w-0 flex-col lg:min-h-[540px] lg:py-2"
          >
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7 lg:grid lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] lg:gap-10">
              <span
                className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white sm:h-36 sm:w-36 lg:h-auto lg:w-full lg:aspect-square"
              >
                {activeMember.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeMember.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span aria-hidden className="flex h-full w-full items-center justify-center text-5xl leading-none sm:text-7xl lg:text-8xl">
                    {activeMember.emoji}
                  </span>
                )}
              </span>

              <div className="min-w-0 text-center sm:text-left">
                <span
                  className="inline-flex max-w-full rounded-full bg-[#ff7272] px-5 py-2 text-xs font-semibold text-[#111111] sm:px-6 sm:py-2.5 sm:text-sm"
                >
                  <span className="truncate">{roleLabels}</span>
                </span>
                <h2
                  id={headingId}
                  className="mt-3 flex items-start justify-center gap-2 break-keep text-[clamp(38px,7vw,64px)] font-bold leading-none tracking-[-0.065em] sm:justify-start"
                >
                  {activeMember.name}
                  <span className="mt-1 text-[0.45em]" aria-hidden>✦</span>
                </h2>
                <p className="mt-4 text-sm opacity-70 sm:text-base">멋쟁이사자처럼 {activeMember.cohort}기</p>
              </div>
            </div>

            <div
              className="mt-6 flex min-h-36 items-center justify-center rounded-[20px] px-6 py-8 text-center sm:min-h-44 sm:px-10 lg:mt-auto lg:min-h-[190px]"
              style={{ backgroundColor: accentSurface }}
            >
              <p className={`max-w-xl break-keep text-base leading-7 sm:text-xl sm:leading-9 ${activeMember.joinReason ? '' : 'opacity-55'}`}>
                {activeMember.joinReason ?? '아직 소개가 등록되지 않았어요.'}
              </p>
            </div>
          </section>

          {/* 오른쪽 — 프로젝트 시안의 밝은 카드에 블로그까지 같은 규칙으로 담는다. */}
          <section
            aria-label="활동"
            className="flex min-w-0 flex-col rounded-[14px] bg-[#eeeeea] p-5 text-[#111111] shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-6 lg:min-h-[540px]"
          >
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">Member archive</p>
                <h3 className="mt-1 text-2xl font-bold tracking-[-0.04em]">활동</h3>
              </div>
              <span className="text-xs text-black/45">블로그 · 프로젝트</span>
            </div>

            {activeActivities.length === 0 ? (
              <p
                className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-dashed border-black/15 px-5 text-center text-sm text-black/50"
                role={activeActivitiesIncomplete ? 'alert' : undefined}
              >
                {activeActivitiesIncomplete
                  ? '활동 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.'
                  : '아직 공개된 활동이 없어요.'}
              </p>
            ) : (
              <div className="flex flex-1 flex-col">
                <div
                  className="relative touch-pan-y"
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={() => {
                    pointerStart.current = null;
                    swiped.current = false;
                  }}
                >
                  <div aria-live="polite" aria-atomic="true">
                    <Link
                      href={activeActivity.href}
                      aria-label={`${activeActivity.title} 자세히 보기`}
                      onClick={(event) => {
                        // 스와이프가 카드 클릭으로 이어져 의도치 않게 상세로 이동하지 않게 한다.
                        if (swiped.current) {
                          event.preventDefault();
                          swiped.current = false;
                        }
                      }}
                      className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 focus-visible:ring-offset-[#eeeeea]"
                    >
                      <div className="overflow-hidden rounded-md">
                        <ActivityVisual key={activeActivity.id} activity={activeActivity} />
                      </div>
                      <div className="pt-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-[#ff5000]">
                            ✦ {activeActivity.kind === 'BLOG' ? '블로그 글' : '프로젝트'}
                          </span>
                          <time
                            dateTime={activeActivity.occurredAt}
                            className="text-xs tabular-nums text-black/40"
                          >
                            {formatDate(activeActivity.occurredAt)}
                          </time>
                        </div>
                        <h4 className="mt-3 line-clamp-2 break-keep text-2xl font-bold leading-tight tracking-[-0.045em] transition-colors group-hover:text-[#ff5000]">
                          {activeActivity.title}
                        </h4>
                        {activeActivity.summary ? (
                          <p className="mt-2 line-clamp-3 break-keep text-sm leading-6 text-black/55">
                            {activeActivity.summary}
                          </p>
                        ) : null}
                        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-black/55 transition-colors group-hover:text-black">
                          {activeActivity.kind === 'BLOG' ? '글 읽기' : '프로젝트 보기'}
                          <span aria-hidden>→</span>
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
                {activeActivitiesIncomplete ? (
                  <p className="mt-3 text-xs text-black/45" role="status">
                    일부 활동을 불러오지 못했어요. 보이는 활동은 계속 둘러볼 수 있어요.
                  </p>
                ) : null}
                <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-5">
                  <span
                    className="text-xs font-semibold tabular-nums tracking-[0.12em] text-black/45"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {String(index + 1).padStart(2, '0')} / {String(activeActivities.length).padStart(2, '0')}
                  </span>
                  {activeActivities.length > 1 ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => move(-1)}
                        aria-label="이전 활동"
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 text-lg outline-none transition-colors hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#eeeeea]"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => move(1)}
                        aria-label="다음 활동"
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 text-lg outline-none transition-colors hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#eeeeea]"
                      >
                        →
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
