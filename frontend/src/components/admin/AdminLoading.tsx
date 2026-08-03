import Skeleton from '@/components/Skeleton';

// admin 화면 공통 로딩 스켈레톤.
// 기존엔 "불러오고 있어요…" 맨텍스트만 떠서 화면 전환 때 레이아웃이 튀었다.
// 실제 admin 화면 대부분이 [제목 + ← 대시보드 버튼] 헤더 + 리스트/폼 본문이라
// 그 골격을 자리표시로 재현한다. role/aria로 로딩 상태는 스크린리더에 그대로 전한다.

type AdminLoadingProps = {
  // 실제 화면의 콘텐츠 래퍼 폭을 그대로 넘겨 레이아웃 점프를 막는다.
  className?: string;
  variant?: 'list' | 'form';
  rows?: number;
};

export default function AdminLoading({
  className = 'mx-auto w-full max-w-6xl',
  variant = 'list',
  rows = 4,
}: AdminLoadingProps) {
  return (
    <div className={className} role="status" aria-label="불러오는 중">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" tone="strong" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      {variant === 'form' ? (
        <div className="flex flex-col gap-6">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-24 rounded-full" tone="faint" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}

// 헤더가 이미 그려진 화면 안쪽(리스트 영역만) 로딩에 쓰는 자리표시 행 묶음.
type SkeletonRowsProps = {
  count?: number;
  rowClassName?: string;
  className?: string;
};

export function SkeletonRows({
  count = 4,
  rowClassName = 'h-16 w-full rounded-xl',
  className = 'flex flex-col gap-3',
}: SkeletonRowsProps) {
  return (
    <div role="status" aria-label="불러오는 중" className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={rowClassName} />
      ))}
    </div>
  );
}
