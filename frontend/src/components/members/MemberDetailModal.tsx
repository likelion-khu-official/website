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

type Props = {
  member: Member | null;
  projects: ProjectSummary[];
  // 프로젝트 정보를 아예 못 불러온 경우(빈 목록과 구분해 다른 문구를 보여준다).
  projectsUnavailable?: boolean;
  onClose: () => void;
};

// 닫힘 애니메이션이 끝난 뒤 언마운트하기까지의 시간(ms). transition duration과 맞춘다.
const CLOSE_MS = 220;
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

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
  projects,
  projectsUnavailable = false,
  onClose,
}: Props) {
  const open = member !== null;
  const [prevOpen, setPrevOpen] = useState(open);
  const [shown, setShown] = useState(false); // 진입 애니메이션(scale/opacity) 토글
  const [closing, setClosing] = useState(false); // 닫힘 애니메이션 동안 마운트 유지
  // 닫히는 동안에도 내용을 그려야 하므로 마지막으로 선택된 멤버를 붙잡아 둔다.
  const [activeMember, setActiveMember] = useState<Member | null>(member);
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

  // Tab이 다이얼로그 밖으로 나가지 않게 가둔다(배경 포커스 차단).
  function handleTabTrap(event: React.KeyboardEvent<HTMLDivElement>) {
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
        onKeyDown={handleTabTrap}
        className={`relative m-0 flex max-h-[92svh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#161616] shadow-[0_-24px_90px_rgba(0,0,0,0.5)] transition-all duration-200 ease-[var(--motion-ease-out)] will-change-transform motion-reduce:transition-none sm:m-4 sm:rounded-3xl sm:shadow-[0_30px_120px_rgba(0,0,0,0.6)] ${
          shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95'
        }`}
      >
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

        <div className="overflow-y-auto overscroll-contain px-6 pb-7 pt-8 sm:px-8">
          {/* 멤버 정보 — 공개 필드만(학과·학번 등 비공개 정보는 노출하지 않는다). */}
          <div className="flex items-center gap-4">
            {activeMember.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeMember.photoUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full border-2 border-white/15 object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/5 text-4xl leading-none"
              >
                {activeMember.emoji}
              </span>
            )}
            <div className="min-w-0">
              <h2 id={headingId} className="truncate text-2xl font-bold tracking-[-0.03em] text-white">
                {activeMember.name}
              </h2>
              <p className="mt-1 text-sm text-accent">{roleLabels}</p>
              <p className="mt-0.5 text-xs text-white/45">{activeMember.cohort}기</p>
            </div>
          </div>

          {activeMember.joinReason && (
            <p className="mt-5 break-keep rounded-2xl bg-white/[0.04] px-4 py-3.5 text-sm leading-6 text-white/75">
              {activeMember.joinReason}
            </p>
          )}

          {/* 참여 프로젝트 */}
          <section aria-label="참여 프로젝트" className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/80">참여 프로젝트</h3>
              {projects.length > 1 && (
                <span className="text-xs tabular-nums text-white/45" aria-hidden>
                  {index + 1} / {projects.length}
                </span>
              )}
            </div>

            {projectsUnavailable ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/50">
                프로젝트 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.
              </p>
            ) : projects.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/50">
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
                    className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/20 outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden bg-[radial-gradient(circle_at_70%_20%,rgba(255,80,0,0.28),transparent_40%),linear-gradient(145deg,#2b2b2b,#151515)]">
                      {activeProject.representativeImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={activeProject.id}
                          src={activeProject.representativeImageUrl}
                          alt={`${activeProject.title} 대표 이미지`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-5xl font-semibold text-white/10">
                            {String(activeProject.cohort).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
                          {activeProject.cohort}기
                        </span>
                      </div>
                      <p className="mt-2 font-semibold tracking-[-0.02em] text-white">
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
