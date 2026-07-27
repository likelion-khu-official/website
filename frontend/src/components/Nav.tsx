'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const navLinks = [
  { href: '#introduce', label: 'Introduce' },
  { href: '#project', label: 'Project' },
  { href: '#members', label: 'Members' },
  { href: '#plan', label: 'Activity' },
  { href: '#blog', label: 'Blog' },
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
  { id: 'recruit', href: '#recruit' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!current) return;
        const match = sections.find(({ element }) => element === current.target);
        if (match) setActiveHref(match.href);
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
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent lg:h-[clamp(44px,4.2vw,64px)] lg:w-[clamp(44px,4.2vw,64px)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="멋쟁이사자처럼 경희대"
            className="h-[80%] w-full object-contain"
          />
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
                  aria-current={active ? 'location' : undefined}
                  className={`group/nav relative inline-flex min-h-11 items-center rounded-md px-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                    active ? 'text-white' : 'text-accent/60 hover:text-accent'
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
                onClick={closeMenu}
                aria-current={activeHref === href ? 'location' : undefined}
                className={`flex min-h-12 items-center justify-between rounded-xl px-3 text-base outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-accent ${
                  activeHref === href ? 'text-white' : 'text-white/65'
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
