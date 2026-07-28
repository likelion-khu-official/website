import type { Metadata } from 'next';
import ActivityMonthCard from '@/components/activities/ActivityMonthCard';
import { activityMonths } from '@/components/activities/activitiesData';

export const metadata: Metadata = {
  title: '활동 소개 — 멋쟁이사자처럼 경희대',
  description: '멋쟁이사자처럼 경희대가 한 해 동안 함께하는 활동을 소개합니다.',
};

export default function ActivitiesPage() {
  return (
    <main className="relative mx-auto min-h-[calc(100svh-88px)] w-full min-w-0 max-w-[1440px] overflow-hidden px-5 pb-24 pt-12 sm:px-10 sm:pb-28 sm:pt-14 lg:px-16 lg:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-400px] -z-0 h-[780px] w-[1050px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(176,34,12,0.33),rgba(19,19,19,0)_68%)] blur-2xl"
      />

      <header className="relative z-[1] min-w-0 max-w-3xl">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Our activities
        </p>
        <h1 className="break-keep break-words text-[clamp(42px,7vw,88px)] font-semibold leading-[0.98] tracking-[-0.065em]">
          함께 성장하는
          <br />
          열두 달
        </h1>
        <p className="mt-7 max-w-xl break-keep break-words text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
          지원부터 종강, 해커톤까지. 멋쟁이사자처럼 경희대가 한 해 동안 함께하는 활동입니다.
        </p>
      </header>

      <section className="relative z-[1] mt-20 min-w-0 border-t border-white/10 pt-8 sm:mt-28">
        <div className="mb-9 flex items-end justify-between">
          <h2 className="text-sm font-medium text-white/45">연간 활동 계획</h2>
          <span className="text-sm tabular-nums text-white/35">{activityMonths.length} months</span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {activityMonths.map((month) => (
            <ActivityMonthCard key={month.month} month={month} />
          ))}
        </div>
      </section>
    </main>
  );
}
