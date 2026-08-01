'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const creators = [
  '김영웅',
  '김현정',
  '신선우',
  '안시현',
  '유한솔',
  '장찬욱',
];

function InstagramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const isWorkspace =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/member' ||
    pathname.startsWith('/member/');

  if (isWorkspace) return null;

  return (
    <footer id="site-footer" className="footer-bg w-full border-t border-white/[0.08] px-5 py-8 sm:px-10 sm:py-12 lg:px-16">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="flex flex-col items-start gap-5 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between min-[360px]:gap-4">
          <div>
            <Link
              href="/"
              aria-label="멋쟁이사자처럼 경희대학교 홈"
              className="inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent sm:gap-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-9 w-auto object-contain sm:h-12" />
              <p className="break-keep text-sm font-bold leading-[1.25] tracking-[-0.01em] sm:text-[clamp(22px,2.2vw,34px)] sm:leading-tight sm:tracking-[-0.035em]">
                <span className="block text-accent sm:inline">멋쟁이사자처럼</span>{' '}
                <span className="block text-white sm:inline">경희대학교</span>
              </p>
            </Link>
          </div>

          <div className="flex shrink-0 gap-2 sm:gap-3">
            <a
              href="https://www.instagram.com/likelion_khu/"
              target="_blank"
              rel="noreferrer"
              aria-label="멋쟁이사자처럼 경희대학교 Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 outline-none transition-colors hover:border-accent/40 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent sm:h-11 sm:w-11"
            >
              <span className="h-5 w-5"><InstagramIcon /></span>
            </a>
            <a
              href="https://github.com/likelion-khu-official"
              target="_blank"
              rel="noreferrer"
              aria-label="멋쟁이사자처럼 경희대학교 GitHub"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 outline-none transition-colors hover:border-accent/40 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent sm:h-11 sm:w-11"
            >
              <span className="h-5 w-5"><GitHubIcon /></span>
            </a>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-5 border-t border-white/[0.08] pt-5 text-[11px] leading-5 text-white/30 sm:mt-8 sm:pt-6 sm:text-xs lg:flex-row lg:items-end lg:justify-between">
          <address className="not-italic">
            <span className="block">서울캠퍼스 · 서울특별시 동대문구 경희대로 26</span>
            <span className="block">국제캠퍼스 · 경기도 용인시 기흥구 덕영대로 1732</span>
          </address>
          <div className="lg:text-right">
            <p className="text-white/35">함께 만든 사람들</p>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 lg:justify-end">
              {creators.map((creator) => (
                <li key={creator}>{creator}</li>
              ))}
            </ul>
            <p className="mt-3 sm:mt-2">© 2026 멋쟁이사자처럼 경희대학교. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
