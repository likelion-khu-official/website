import Skeleton from '@/components/Skeleton';

// 블로그 글 상세(blog/[slug]/page.tsx) 로딩 자리표시.
// 헤더(제목 + 작성자) → 대표 이미지 → 본문 순서를 실제 글 화면에 맞춘다.
export default function PostLoading() {
  return (
    <article className="mx-auto w-full max-w-[848px] px-5 pt-4 sm:px-10">
      <div className="mb-6 flex min-h-11 items-center">
        <Skeleton className="h-4 w-14 rounded-full" tone="faint" />
      </div>
      <header className="mb-8 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full sm:h-10" tone="strong" />
          <Skeleton className="h-8 w-2/3 sm:h-10" tone="strong" />
        </div>
        <div className="mt-1 flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" tone="faint" />
          </div>
        </div>
      </header>

      <Skeleton className="mb-8 aspect-[16/9] w-full rounded-2xl" tone="strong" />

      <div className="flex flex-col gap-3">
        {[
          'w-full',
          'w-full',
          'w-11/12',
          'w-full',
          'w-4/5',
          'w-full',
          'w-3/4',
        ].map((width, index) => (
          <Skeleton key={index} className={`h-4 ${width}`} tone="faint" />
        ))}
      </div>
    </article>
  );
}
