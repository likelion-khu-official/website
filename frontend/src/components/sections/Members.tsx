import Link from 'next/link';
import type { Staff } from '@shared/types/staff';
import { getStaff } from '@/lib/rosterApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';
import StaffShowcaseCard from '@/components/staff/StaffShowcaseCard';

export default async function Members() {
  const baseUrl = await getBaseUrl();
  let staff: Staff[] = [];
  let failed = false;

  try {
    staff = await getStaff(baseUrl);
  } catch {
    failed = true;
  }

  // 회장부터 기획·홍보부장까지 핵심 운영진 7명을 소개하고, 전체 명단은 /members로 잇는다.
  const featured = staff.slice(0, 7);
  return (
    <section
      id="members"
      className="members-bg relative flex min-h-screen min-h-[100svh] w-full flex-col justify-center overflow-x-clip px-5 pb-12 pt-24 sm:px-10 sm:pb-14 sm:pt-28 lg:px-16 lg:pb-8 lg:pt-20"
    >
      <div className="members-glow-base" />
      <div className="members-glow-accent" />

      <div className="relative z-[1] mx-auto w-full max-w-[1390px]">
        <header className="scroll-reveal grid gap-4 border-b border-white/10 pb-5 text-left sm:grid-cols-[1fr_auto] sm:items-end sm:gap-8 sm:pb-6">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Our team · 14th</p>
            <h2
              className="max-w-[920px] text-balance break-keep font-semibold leading-[1.28] text-white"
              style={{ fontSize: 'clamp(28px, 3.5vw, 52px)', letterSpacing: '-0.055em' }}
            >
              함께 방향을 만들고,
              <br className="sm:hidden" /> 끝까지 실행합니다.
            </h2>
          </div>
          <p className="max-w-[330px] break-keep text-[12px] leading-[1.65] text-white/45 sm:text-right sm:text-[13px]">
            기획부터 세션, 홍보까지
            <br className="hidden sm:block" /> 14기의 성장을 설계하는 운영진입니다.
          </p>
        </header>

        {failed ? (
          <div className="mt-16 rounded-[24px] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-sm text-white/50">운영진 명단을 불러오지 못했어요.</p>
          </div>
        ) : featured.length === 0 ? (
          <div className="mt-16 rounded-[24px] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-sm text-white/50">운영진 소개를 준비하고 있어요.</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-x-5 sm:gap-y-5 xl:grid-cols-7 xl:gap-4">
            {featured.map((person, index) => (
              <div
                key={person.id}
                className="scroll-reveal member-card-reveal min-w-0"
                style={{ '--reveal-y': `${34 + index * 6}px` } as React.CSSProperties}
              >
                <StaffShowcaseCard staff={person} />
              </div>
            ))}
          </div>
        )}

        <div className="scroll-reveal mt-5 flex justify-end">
          <Link
            href="/members"
            className="group inline-flex min-h-11 items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[12px] font-semibold text-white/70 outline-none transition-colors hover:border-accent/50 hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            14기 멤버 전체 보기
            <span aria-hidden className="text-base leading-none text-accent transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
