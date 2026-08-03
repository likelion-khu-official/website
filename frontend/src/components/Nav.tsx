'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const navLinks = [
  { href: '#introduce', label: 'Introduce' },
  { href: '#project', label: 'Project' },
  { href: '#members', label: 'Members' },
  { href: '#plan', label: 'Activity' },
  { href: '#blog', label: 'Blog' },
  { href: '#faq', label: 'FAQ' },
  { href: '#recruit', label: 'Recruit' },
];

const observedSections = [
  { id: 'thumbnail', href: null },
  { id: 'introduce', href: '#introduce' },
  { id: 'session', href: '#introduce' },
  { id: 'project', href: '#project' },
  { id: 'members', href: '#members' },
  { id: 'plan', href: '#plan' },
  { id: 'blog', href: '#blog' },
  { id: 'faq', href: '#faq' },
  { id: 'recruit', href: '#recruit' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const snapRestoreRef = useRef(0);

  // 앵커로 부드럽게 스크롤한다. proximity 스크롤 스냅이 켜져 있으면, 진행 중인 스무스 스크롤이
  // 목표까지 가는 도중 중간 섹션의 스냅점에 붙잡혀 목표보다 덜 스크롤되는(아래로 덜 가는) 버그가
  // 있다 — 아래쪽 섹션일수록 지나치는 스냅점이 많아 오차가 커진다. 그래서 스크롤 동안만 스냅을
  // 끄고, 착지 후 되돌린다(자유 스크롤의 읽기 리듬은 유지).
  function scrollToHashId(id: string, behavior: ScrollBehavior) {
    const el = document.getElementById(id);
    if (!el) return false;
    const html = document.documentElement;
    const padding = parseInt(getComputedStyle(html).scrollPaddingTop, 10) || 0;
    const top = el.getBoundingClientRect().top + window.scrollY - padding;

    window.clearTimeout(snapRestoreRef.current);
    html.style.setProperty('scroll-snap-type', 'none');
    window.scrollTo({ top, behavior });
    snapRestoreRef.current = window.setTimeout(
      () => {
        html.style.removeProperty('scroll-snap-type');
      },
      behavior === 'smooth' ? 700 : 60,
    );
    return true;
  }

  function handleAnchorClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith('#')) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (scrollToHashId(href.slice(1), reduce ? 'auto' : 'smooth')) {
      event.preventDefault();
      window.history.pushState(null, '', href);
    }
    setOpen(false);
  }

  // 다른 페이지에서 해시(예: /#faq)로 진입할 때도 같은 스냅 언더슛이 나므로, 마운트 후 한 번 보정한다.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => scrollToHashId(id, reduce ? 'auto' : 'smooth'), 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  useEffect(() => {
    const sections = observedSections
      .map(({ id, href }) => {
        const element = document.getElementById(id);
        return element ? { element, href } : null;
      })
      .filter(
        (section): section is { element: HTMLElement; href: string | null } => section !== null,
      );

    // 각 섹션의 최신 교차 비율을 누적해 두고, 그중 가장 많이 보이는 섹션을 활성으로 삼는다.
    // IntersectionObserver 콜백은 "이번에 상태가 바뀐" 엔트리만 넘겨주기 때문에, 그 배치 안에서만
    // 승자를 고르면 — 빠른 스크롤이나 nav 연타로 여러 임계값이 얽힐 때 — 정작 화면을 채운 섹션이
    // 배치에 없어(이미 교차 중이라 새 임계값을 안 넘음) 빠져나가는 섹션이 잘못 활성으로 남는다
    // (스크롤 위치 ↔ nav 불일치). 전체 비율 맵으로 판정해 이 desync를 막는다.
    const ratios = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let bestHref: string | null = null;
        let bestRatio = 0;
        for (const { element, href } of sections) {
          const ratio = ratios.get(element) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestHref = href;
          }
        }

        // 밴드 안에 아무 섹션도 없으면(섹션 사이 등) 직전 활성을 유지해 깜빡임을 막는다.
        if (bestRatio > 0) setActiveHref(bestHref);
      },
      {
        rootMargin: '-22% 0px -58% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach(({ element }) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function updateScrolledState() {
      setScrolled(window.scrollY > 20);
    }

    updateScrolledState();
    window.addEventListener('scroll', updateScrolledState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolledState);
  }, []);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 border-b transition-[background-color,border-color] duration-300 ${
        scrolled
          ? 'border-white/[0.08] bg-background/88 shadow-[0_8px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl'
          : 'border-transparent bg-background/45 backdrop-blur-md'
      }`}
    >
      <nav
        aria-label="주요 메뉴"
        className="mx-auto flex min-h-16 max-w-[1730px] items-center justify-between px-5 sm:px-8 lg:px-[clamp(40px,4vw,70px)]"
      >
        <Link
          href="/"
          onClick={closeMenu}
          aria-label="멋쟁이사자처럼 경희대 홈"
          className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            className="h-8 w-auto object-contain sm:h-9 lg:h-10"
          />
          <span className="hidden text-[15px] font-semibold tracking-[-0.02em] text-white/80 sm:block lg:text-base">
            멋쟁이사자처럼 경희대
          </span>
        </Link>

        <ul
          className="hidden items-center gap-[clamp(24px,4vw,77px)] whitespace-nowrap text-[clamp(14px,1.15vw,20px)] tracking-[0.5px] lg:flex"
          style={{ fontFamily: 'var(--font-gremlin-trial)' }}
        >
          {navLinks.map(({ href, label }) => {
            const active = activeHref === href;
            return (
              <li key={href}>
                <a
                  href={href}
                  onClick={(event) => handleAnchorClick(event, href)}
                  aria-current={active ? 'location' : undefined}
                  className={`group/nav relative inline-flex min-h-11 items-center rounded-md px-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                    active ? 'text-accent' : 'text-accent/60 hover:text-accent'
                  }`}
                >
                  {label}
                  <span
                    aria-hidden
                    className={`absolute inset-x-1 bottom-1 h-px origin-left bg-accent transition-transform duration-300 ${
                      active ? 'scale-x-100' : 'scale-x-0 group-hover/nav:scale-x-100'
                    }`}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            {open ? (
              <>
                <path d="m6 6 12 12" />
                <path d="M18 6 6 18" />
              </>
            ) : (
              <>
                <path d="M5 8h14" />
                <path d="M5 16h14" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <ul
          id="mobile-navigation"
          className="flex max-h-[calc(100svh-4rem)] flex-col overflow-y-auto border-t border-white/[0.06] bg-background/95 px-5 py-3 backdrop-blur-xl lg:hidden"
          style={{ fontFamily: 'var(--font-gremlin-trial)' }}
        >
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                onClick={(event) => handleAnchorClick(event, href)}
                aria-current={activeHref === href ? 'location' : undefined}
                className={`flex min-h-12 items-center justify-between rounded-xl px-3 text-base outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-accent ${
                  activeHref === href ? 'bg-white/[0.06] text-white' : 'text-white/65'
                }`}
              >
                {label}
                {activeHref === href ? (
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div aria-hidden className="site-scroll-track absolute inset-x-0 bottom-0 h-px bg-white/[0.04]">
        <div className="site-scroll-progress h-full origin-left bg-accent" />
      </div>
    </header>
  );
}
