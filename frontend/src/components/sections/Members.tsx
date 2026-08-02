import Link from 'next/link';
import type { Staff } from '@shared/types/staff';
import { getStaff } from '@/lib/rosterApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';
import { sortStaffForLanding } from '@/lib/staffLanding';
import StaffShowcaseCard from '@/components/staff/StaffShowcaseCard';

export default async function Members() {
  const baseUrl = await getBaseUrl();
  let staff: Staff[] = [];
  let failed = false;

  try {
    staff = sortStaffForLanding(await getStaff(baseUrl));
  } catch {
    failed = true;
  }

  return (
    <section
      id="members"
      className="members-bg relative flex w-full flex-col justify-center overflow-x-clip px-5 py-24 sm:px-10 sm:py-32 lg:px-16 lg:py-36"
    >
      <div className="relative z-[1] mx-auto w-full max-w-[1440px]">
        <header className="scroll-reveal grid gap-6 pb-7 text-left lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="landing-section-kicker">
              Our team · 14th
            </p>
            <h2 className="landing-section-title mt-3 max-w-4xl text-balance break-keep">
              14기를 만드는 사람들
            </h2>
            <p className="landing-section-copy mt-4 max-w-3xl break-keep">
              세션을 기획하고, 멤버를 연결하고,
              우리의 활동을 세상에 전합니다.
            </p>
          </div>
          <Link
            href="/members"
            className="group inline-flex min-h-11 w-fit items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[12px] font-semibold text-white/70 outline-none transition-colors hover:border-accent/50 hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            14기 멤버 전체 보기
            <span aria-hidden className="text-base leading-none text-accent transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </header>

        {failed ? (
          <div className="mt-16 rounded-[24px] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-sm text-white/50">운영진 명단을 불러오지 못했어요.</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="mt-16 rounded-[24px] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-sm text-white/50">운영진 소개를 준비하고 있어요.</p>
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-7 sm:mt-8 sm:grid-cols-4 sm:gap-x-5 sm:gap-y-5 sm:pt-8 xl:grid-cols-7 xl:gap-4">
            {staff.map((person, index) => (
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

      </div>
    </section>
  );
}
