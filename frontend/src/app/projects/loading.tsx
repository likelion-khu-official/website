import Skeleton from '@/components/Skeleton';

// 프로젝트 목록(projects/page.tsx)이 서버에서 데이터를 기다리는 동안 보여줄 자리표시.
// 실제 화면의 헤더 + 카드 그리드(ProjectsGallery/ProjectCard) 구조를 그대로 따른다.
export default function ProjectsLoading() {
  return (
    <main className="mx-auto min-h-[calc(100svh-88px)] w-full max-w-6xl px-4 pb-24 pt-8 sm:px-8 sm:pt-11 lg:px-10">
      <header className="mb-7 flex items-end justify-between gap-6 border-b border-white/15 pb-6 sm:mb-9 sm:pb-8">
        <div className="min-w-0">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="mt-3 h-9 w-64 max-w-full sm:h-12 sm:w-[22rem]" tone="strong" />
        </div>
        <div className="hidden shrink-0 items-baseline gap-2 sm:flex">
          <Skeleton className="h-8 w-10" tone="strong" />
          <Skeleton className="h-3 w-14 rounded-full" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-12">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="min-w-0">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" tone="strong" />
            <div className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-6 shrink-0 rounded-full" tone="faint" />
              </div>
              <Skeleton className="mt-2 hidden h-3 w-full sm:block" tone="faint" />
              <Skeleton className="mt-2 hidden h-3 w-1/2 sm:block" tone="faint" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
