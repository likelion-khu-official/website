import Skeleton from '@/components/Skeleton';

// 멤버 목록(members/page.tsx) 로딩 자리표시.
// 아카이브 헤더 + 멤버 카드 그리드(MemberCard: 156/189 비율)를 따른다.
export default function MembersLoading() {
  return (
    <main className="mx-auto min-h-[calc(100svh-64px)] w-full max-w-6xl px-5 pb-24 pt-4 sm:px-8 sm:pb-28 sm:pt-6 lg:px-10">
      <div className="mb-5 flex min-h-11 items-center sm:mb-7">
        <Skeleton className="h-4 w-16 rounded-full" tone="faint" />
      </div>

      <header className="flex min-w-0 items-end justify-between gap-8 border-b border-white/12 pb-8 sm:pb-10">
        <div className="min-w-0">
          <Skeleton className="mb-3 h-3 w-32 rounded-full" />
          <Skeleton className="h-9 w-[min(28rem,90%)] sm:h-14" tone="strong" />
          <Skeleton className="mt-4 h-4 w-[min(32rem,80%)]" tone="faint" />
        </div>
        <div className="hidden shrink-0 items-baseline gap-2 sm:flex">
          <Skeleton className="h-8 w-10" tone="strong" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-9 sm:grid-cols-3 sm:gap-x-[38px] sm:gap-y-[38px] md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-[156/189] w-full max-w-[156px] justify-self-center rounded-[clamp(18px,5.5vw,22px)]"
            tone="strong"
          />
        ))}
      </div>
    </main>
  );
}
