'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const navLinks = [
  { href: '#introduce', label: 'Introduce' },
  { href: '#project', label: 'Project' },
  { href: '#members', label: 'Members' },
  { href: '#plan', label: 'Activity' },
  { href: '#blog', label: 'Blog' },
  { href: '#recruit', label: 'Recruit' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-white/[0.06] bg-background/75 backdrop-blur-xl">
      <nav className="mx-auto flex min-h-16 max-w-[1730px] items-center justify-between px-5 sm:px-8 lg:px-[clamp(40px,4vw,70px)]">
        <Link
          href="/"
          onClick={() => setOpen(false)}
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
          {navLinks.map(({ href, label }, i) => (
            <li key={href}>
              <a
                href={href}
                className={`inline-flex min-h-11 items-center rounded-md px-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  i === 0 ? 'text-white' : 'text-accent/60 hover:text-accent'
                }`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <button
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
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-3 text-base text-white outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-accent"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
