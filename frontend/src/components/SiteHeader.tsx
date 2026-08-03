import Link from 'next/link';

// 랜딩(Nav)과 하위 페이지 헤더의 통일감을 위한 공용 사이트 헤더.
// 로고·워드마크·컨테이너 폭·패딩 리듬을 랜딩 Nav와 "같은 값"으로 맞춘다.
// 헤더는 브랜드(로고)만 둔다 — 온 곳으로 돌아가는 "홈으로"는 헤더 코너 버튼이 아니라
// 본문 시작점의 담백한 백링크(BackLink)로 분리한다(로고=홈 top, 백링크=온 섹션).
export default function SiteHeader() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex min-h-16 max-w-[1730px] items-center px-5 sm:px-8 lg:px-[clamp(40px,4vw,70px)]">
        <Link
          href="/"
          aria-label="멋쟁이사자처럼 경희대 홈"
          className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-8 w-auto object-contain sm:h-9 lg:h-10" />
          <span className="hidden text-[15px] font-semibold tracking-[-0.02em] text-white/80 sm:block lg:text-base">
            멋쟁이사자처럼 경희대
          </span>
        </Link>
      </div>
    </header>
  );
}
