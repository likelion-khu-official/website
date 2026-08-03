import Link from 'next/link';

// 하위 페이지에서 온 곳(보통 랜딩의 해당 섹션)으로 돌아가는 담백한 백링크.
// 헤더 코너의 테두리 알약이 아니라, 본문 시작점에 놓는 텍스트 링크 — 에디토리얼 관례.
// hover 시 화살표가 살짝 왼쪽으로 밀려 "뒤로"를 암시한다.
export default function BackLink({
  href = '/',
  children = '홈으로',
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-white/50 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-0.5">
        ←
      </span>
      {children}
    </Link>
  );
}
