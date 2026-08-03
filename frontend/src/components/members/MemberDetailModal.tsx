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
import type { ProjectSummary } from '@shared/types/project';
import { ROLE_LABELS } from '@/lib/roster';

type Accent = readonly [string, string]; // [배경색, 글자색] — 멤버 카드 색 쌍

type Props = {
  member: Member | null;
  // 선택한 멤버 카드의 색 쌍. 아바타 링·세션 배지·상단 글로우에 악센트로만 쓴다.
  accent?: Accent;
  projects: ProjectSummary[];
  // 프로젝트 정보를 아예 못 불러온 경우(빈 목록과 구분해 다른 문구를 보여준다).
  projectsUnavailable?: boolean;
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

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export default function MemberDetailModal({
  member,
  accent,
  projects,
  projectsUnavailable = false,
  onClose,
}: Props) {
  const open = member !== null;
  const [prevOpen, setPrevOpen] = useState(open);
  const [shown, setShown] = useState(false); // 진입 애니메이션(scale/opacity) 토글
  const [closing, setClosing] = useState(false); // 닫힘 애니메이션 동안 마운트 유지
  // 닫히는 동안에도 내용을 그려야 하므로 마지막 선택 멤버·색을 붙잡아 둔다.
  const [activeMember, setActiveMember] = useState<Member | null>(member);
  const [activeAccent, setActiveAccent] = useState<Accent>(accent ?? FALLBACK_ACCENT);
  const [index, setIndex] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<Element | null>(null);
  const pointerStart = useRef<number | null>(null);
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
      setIndex((current) => (current + direction + projects.length) % projects.length);
    },
    [projects.length],
  );

  // Tab이 다이얼로그 밖으로 나가지 않게 가둔다(배경 포커스 차단). 좌우 화살표로 프로젝트 이동.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' && projects.length > 1) move(-1);
    if (event.key === 'ArrowRight' && projects.length > 1) move(1);
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
  }
  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerStart.current !== null && projects.length > 1) {
      const distance = event.clientX - pointerStart.current;
      if (Math.abs(distance) > 48) move(distance > 0 ? -1 : 1);
    }
    pointerStart.current = null;
  }

  if (!rendered || !activeMember) return null;

  const [accentBg, accentFg] = activeAccent;
  const roleLabels = activeMember.roles.map((role) => ROLE_LABELS[role]).join(' · ');
  const activeProject = projects[index];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
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
        className={`relative flex max-h-[92svh] w-full max-w-[880px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-background shadow-[0_-24px_90px_rgba(0,0,0,0.5)] transition-all duration-200 ease-[var(--motion-ease-out)] will-change-transform motion-reduce:transition-none sm:m-4 sm:rounded-3xl sm:shadow-[0_30px_120px_rgba(0,0,0,0.6)] ${
          shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95'
        }`}
      >
        {/* 멤버 카드 색을 은은한 상단 글로우로만 얹는다(넓은 채우기 대신 악센트). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(120% 65% at 0% 0%, ${accentBg}26, transparent 62%)` }}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        <div className="relative flex flex-col gap-6 overflow-y-auto overscroll-contain p-6 sm:flex-row sm:gap-8 sm:p-8">
          {/* 왼쪽 — 멤버(공개 필드만. 학과·학번은 공개 API/PM 결정 #423 전까지 노출하지 않는다) */}
          <div className="sm:w-[42%] sm:shrink-0">
            <div className="flex items-center gap-4">
              <span
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2"
                style={{ borderColor: accentBg }}
              >
                {activeMember.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeMember.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span aria-hidden className="flex h-full w-full items-center justify-center bg-white/5 text-4xl leading-none">
                    {activeMember.emoji}
                  </span>
                )}
              </span>

              <div className="min-w-0">
                <span
                  className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: accentBg, color: accentFg }}
                >
                  {roleLabels}
                </span>
                <h2 id={headingId} className="mt-2 truncate text-2xl font-bold tracking-[-0.03em] text-foreground">
                  {activeMember.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted">{activeMember.cohort}기</p>
              </div>
            </div>

            {activeMember.joinReason && (
              <p className="mt-5 break-keep rounded-2xl bg-white/[0.04] px-4 py-3.5 text-sm leading-6 text-white/75">
                {activeMember.joinReason}
              </p>
            )}
          </div>

          {/* 오른쪽 — 참여 프로젝트 */}
          <section aria-label="참여 프로젝트" className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/80">참여 프로젝트</h3>
              {projects.length > 1 && (
                <span className="text-xs tabular-nums text-muted" aria-hidden>
                  {index + 1} / {projects.length}
                </span>
              )}
            </div>

            {projectsUnavailable ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-muted">
                프로젝트 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.
              </p>
            ) : projects.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-muted">
                아직 등록된 프로젝트가 없어요.
              </p>
            ) : (
              <div
                className="relative"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => {
                  pointerStart.current = null;
                }}
              >
                <div aria-live="polite" aria-atomic="true">
                  <Link
                    href={`/projects/${activeProject.id}`}
                    className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-black/30">
                      {activeProject.representativeImageUrl ? (
                        // 잘라내지 않고 원본 비율 그대로(object-contain).
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={activeProject.id}
                          src={activeProject.representativeImageUrl}
                          alt={`${activeProject.title} 대표 이미지`}
                          className="h-full w-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-5xl font-semibold text-white/10">
                          {String(activeProject.cohort).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-muted">
                        {activeProject.cohort}기
                      </span>
                      <p className="mt-2 font-semibold tracking-[-0.02em] text-foreground">
                        {activeProject.title}
                      </p>
                      <p className="mt-1 line-clamp-2 break-keep text-sm leading-5 text-white/55">
                        {activeProject.summary}
                      </p>
                    </div>
                  </Link>
                </div>

                {projects.length > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => move(-1)}
                      aria-label="이전 프로젝트"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => move(1)}
                      aria-label="다음 프로젝트"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
