import Skeleton from '@/components/Skeleton';

// 프로젝트 상세(projects/[id]/page.tsx) 로딩 자리표시.
// 좌: 이미지 갤러리 / 우: 제목·요약·만든 사람·정보 — 실제 2단 레이아웃을 따른다.
export default function ProjectDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-8 sm:pt-10 lg:px-10">
      <Skeleton className="h-5 w-28 rounded-full" tone="faint" />

      <div className="mt-4 grid gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)] lg:items-start lg:gap-12 xl:gap-16">
        <section className="min-w-0">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" tone="strong" />
          <div className="mt-3 flex gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square w-16 rounded-lg sm:w-20" />
            ))}
          </div>
        </section>

        <article className="min-w-0 lg:pt-1">
          <Skeleton className="h-4 w-40 rounded-full" tone="faint" />
          <Skeleton className="mt-4 h-10 w-3/4 sm:h-12" tone="strong" />
          <div className="mt-5 flex flex-col gap-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="mt-8 border-t border-white/15 pt-5">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" tone="strong" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-white/15 pt-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-4 w-2/3" tone="faint" />
            <Skeleton className="mt-4 h-11 w-40 rounded-lg" />
          </div>
        </article>
      </div>
    </main>
  );
}
