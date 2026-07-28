import type { Metadata } from 'next';
import NotificationForm from '@/components/NotificationForm';

export const metadata: Metadata = {
  title: '모집 안내 — 멋쟁이사자처럼 경희대',
  description: '경희대학교 멋쟁이사자처럼과 함께할 아기사자를 기다립니다.',
};

// 모집 open/closed 공개 조회 API가 아직 없어(PM 결정 대기 중) 상태 분기는 구현하지 않았다.
// API가 생기면 이 섹션에서 open 여부에 따라 절차 카드 ↔ 지원 CTA로 분기하면 된다.
export default function RecruitPage() {
  return (
    <main className="relative mx-auto min-h-[calc(100svh-88px)] w-full min-w-0 max-w-[1440px] overflow-hidden px-5 pb-24 pt-12 sm:px-10 sm:pb-28 sm:pt-14 lg:px-16 lg:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-400px] -z-0 h-[780px] w-[1050px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(176,34,12,0.33),rgba(19,19,19,0)_68%)] blur-2xl"
      />

      <header className="relative z-[1] min-w-0 max-w-3xl">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Our recruit
        </p>
        <h1 className="break-keep break-words text-[clamp(42px,7vw,88px)] font-semibold leading-[0.98] tracking-[-0.065em]">
          아이디어를 현실로
          <br />
          만드는 여정
        </h1>
        <p className="mt-7 max-w-xl break-keep break-words text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
          경희대학교 멋쟁이사자처럼과 함께할 아기사자를 기다립니다.
        </p>
      </header>

      <section className="relative z-[1] mt-20 min-w-0 border-t border-white/10 pt-8 sm:mt-28">
        <h2 className="text-sm font-medium text-white/45">모집 절차</h2>
        <div className="mt-9 flex min-h-40 flex-col items-start justify-center gap-2 rounded-3xl border border-dashed border-white/15 px-6 py-8 sm:px-8">
          <p className="text-lg font-semibold text-white">모집 절차는 추후 공지 예정이에요.</p>
          <p className="text-sm text-white/45">
            매년 1월경 새 기수를 모집해요. 자세한 일정은 모집 시작과 함께 안내드려요.
          </p>
        </div>
      </section>

      <section className="relative z-[1] mt-16 min-w-0 border-t border-white/10 pt-8 sm:mt-20">
        <h2 className="text-sm font-medium text-white/45">모집 알림</h2>
        <div className="mt-9 rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-10 sm:px-10 sm:py-12">
          <p className="mb-8 max-w-xl break-keep text-base leading-7 text-white/65">
            모집이 시작되면 가장 먼저 알려드려요. 이메일을 남겨주시면 모집 시작 시 안내 메일을 보내드립니다.
          </p>
          <NotificationForm />
        </div>
      </section>
    </main>
  );
}
