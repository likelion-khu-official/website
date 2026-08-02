import Skeleton from '@/components/Skeleton';

// 블로그 목록(blog/page.tsx) 로딩 자리표시.
// 기존 스켈레톤은 실제 목록과 컨테이너 폭·레이아웃이 어긋나 있었다(더 넓은 셸 + 피처
// 카드 그리드). 실제 화면은 헤더 + PostCard 행 리스트라 그 구조에 맞춘다.
export default function BlogLoading() {
  return (
    <main className="mx-auto min-h-[calc(100svh-88px)] w-full min-w-0 max-w-6xl px-5 pb-24 pt-4 sm:px-8 sm:pb-28 sm:pt-6 lg:px-10">
      <div className="mb-5 flex min-h-11 items-center sm:mb-7">
        <Skeleton className="h-4 w-16 rounded-full" tone="faint" />
      </div>
      <header className="flex min-w-0 items-end justify-between gap-8 border-b border-white/12 pb-8 sm:pb-10">
        <div className="min-w-0">
          <Skeleton className="mb-3 h-3 w-12 rounded-full" />
          <Skeleton className="h-9 w-40 sm:h-14 sm:w-56" tone="strong" />
          <Skeleton className="mt-4 h-4 w-64 max-w-full" tone="faint" />
        </div>
        <Skeleton className="hidden h-3 w-16 shrink-0 rounded-full sm:block" tone="faint" />
      </header>

      <section className="mt-5 min-w-0 sm:mt-7">
        <div className="border-b border-white/10">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-4 border-t border-white/10 py-5 first:border-t-0 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-6 sm:py-7 lg:grid-cols-[240px_minmax(0,1fr)_auto] lg:gap-8"
            >
              <Skeleton className="aspect-[16/10] w-full rounded-xl" tone="strong" />
              <div className="min-w-0">
                <Skeleton className="h-5 w-11/12 sm:h-7" />
                <Skeleton className="mt-2 hidden h-4 w-full max-w-2xl sm:block" tone="faint" />
                <div className="mt-3 flex items-center gap-2.5 sm:mt-4">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <Skeleton className="h-3 w-24" tone="faint" />
                </div>
              </div>
              <Skeleton className="hidden h-5 w-5 sm:block" tone="faint" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
