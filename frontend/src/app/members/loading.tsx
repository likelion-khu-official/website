import Skeleton from '@/components/Skeleton';

// 멤버 목록(members/page.tsx) 로딩 자리표시.
// 헤더(가운데 정렬) + 멤버 카드 그리드(MemberCard: 156/189 비율)를 따른다.
export default function MembersLoading() {
  return (
    <main className="relative min-h-screen min-h-[100svh] overflow-hidden bg-background px-5 pb-24 pt-8 sm:px-10 lg:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_50%_-10%,rgba(255,80,0,0.3),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[1320px]">
        <Skeleton className="h-5 w-20 rounded-full" tone="faint" />

        <header className="flex flex-col items-center pb-12 pt-16 sm:pb-16 sm:pt-24">
          <Skeleton className="h-3.5 w-32 rounded-full" />
          <Skeleton className="mt-5 h-11 w-[min(28rem,90%)] sm:h-16" tone="strong" />
          <Skeleton className="mt-6 h-4 w-[min(32rem,80%)]" tone="faint" />
        </header>

        <div className="grid grid-cols-2 justify-center gap-x-3 gap-y-8 sm:grid-cols-[repeat(auto-fit,minmax(144px,156px))] sm:gap-x-[38px] sm:gap-y-[38px]">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton
              key={index}
              className="aspect-[156/189] w-full max-w-[156px] justify-self-center rounded-[clamp(18px,5.5vw,22px)]"
              tone="strong"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
