'use client';

import { useState } from 'react';
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

  return (
    <header className="fixed top-0 left-0 right-0 z-20">
      <nav className="flex items-center justify-between px-[clamp(24px,4vw,70px)] pt-[clamp(20px,2.6vw,40px)] pb-[clamp(16px,2vw,28px)]">
        <Link
          href="/"
          className="relative w-[clamp(44px,4.2vw,64px)] h-[clamp(35px,3.3vw,50px)] shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="멋쟁이사자처럼 경희대"
            className="absolute inset-0 w-full h-full object-contain"
          />
        </Link>

        <ul
          className="hidden md:flex items-center gap-[clamp(24px,4vw,77px)] text-[clamp(14px,1.15vw,20px)] tracking-[0.5px] whitespace-nowrap"
          style={{ fontFamily: 'var(--font-gremlin-trial)' }}
        >
          {navLinks.map(({ href, label }, i) => (
            <li key={href}>
              <a
                href={href}
                className={i === 0 ? 'text-white' : 'text-accent/50 hover:text-accent transition-colors'}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-sm text-white"
          aria-expanded={open}
          aria-label="메뉴 열기"
        >
          {open ? '닫기' : '메뉴'}
        </button>
      </nav>

      {open && (
        <ul className="md:hidden flex flex-col px-6 py-4 gap-4 bg-background/95 backdrop-blur">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <a href={href} onClick={() => setOpen(false)} className="text-sm text-white">
                {label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
