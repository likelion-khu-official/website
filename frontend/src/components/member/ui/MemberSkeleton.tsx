/**
 * 로딩 자리표시자 블록. 실제 콘텐츠 표면과 같은 radius·톤을 써서
 * 로딩→콘텐츠 전환 시 레이아웃이 튀지 않게 한다(DESIGN.md 스켈레톤 규칙).
 * prefers-reduced-motion에서는 펄스를 끈다.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-3xl border border-white/5 bg-white/[0.035] motion-reduce:animate-none ${className}`}
    />
  );
}

/** 카드 그리드형 목록(내 글/내 프로젝트)의 로딩 뼈대. */
export function CardGridSkeleton({
  count = 2,
  height = 'h-56',
}: {
  count?: number;
  height?: string;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={height} />
      ))}
    </div>
  );
}
