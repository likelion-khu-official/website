type Social = { label: string; href: string; icon: React.ReactNode };

const socials: Social[] = [
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-1/2 h-1/2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Notion',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-1/2 h-1/2">
        <rect x="4" y="3.5" width="16" height="17" rx="2" />
        <path d="M9 16V9l6 7V9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com/likelion-khu-official',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-1/2 h-1/2">
        <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="footer-bg w-full px-6 sm:px-[4vw] py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1730px] flex flex-col gap-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          {/* 브랜드 + 주소 */}
          <div className="flex flex-col gap-5">
            <h2
              className="font-bold leading-none"
              style={{ fontSize: 'clamp(20px, 2vw, 34px)', letterSpacing: '-1.2px' }}
            >
              <span className="text-white">경희대학교 </span>
              <span className="text-accent">멋쟁이사자처럼</span>
            </h2>
            <div
              className="flex flex-col gap-1 text-[#8b8b8b]"
              style={{ fontSize: 'clamp(12px, 0.95vw, 16px)', letterSpacing: '-0.4px' }}
            >
              <p>서울특별시 동대문구 경희대로 26</p>
              <p>경기도 용인시 기흥구 덕영대로 1732</p>
            </div>
          </div>

          {/* 소셜 아이콘 */}
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="flex items-center justify-center rounded-full bg-[rgba(176,34,12,0.28)] text-accent hover:bg-[rgba(176,34,12,0.45)] transition-colors"
                style={{ width: 'clamp(44px, 3.6vw, 60px)', height: 'clamp(44px, 3.6vw, 60px)' }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* 저작권 */}
        <p
          className="text-[#5a5a5a]"
          style={{ fontSize: 'clamp(12px, 0.95vw, 16px)', letterSpacing: '-0.2px' }}
        >
          Copyright© 2026 All rights reserved by LikeLion KHU
        </p>
      </div>
    </footer>
  );
}
