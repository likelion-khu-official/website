import Link from 'next/link';
import type { Staff } from '@shared/types/staff';
import { getStaff } from '@/lib/rosterApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

function StaffPhoto({ staff }: { staff: Staff }) {
  return (
    <div className="h-full w-full overflow-hidden bg-gradient-to-br from-[#3f251d] to-[#1b1716]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={staff.photoUrl} alt={`${staff.name} 프로필`} className="h-full w-full object-cover" />
    </div>
  );
}

function StaffCard({ staff }: { staff: Staff }) {
  return (
    <article className="group flex h-full min-h-0 flex-col items-center px-2 pb-5 text-center">
      <div className="relative h-28 w-28 overflow-hidden rounded-full ring-1 ring-white/10 transition-[box-shadow,transform] duration-300 group-hover:ring-accent/50 min-[400px]:h-32 min-[400px]:w-32 sm:h-28 sm:w-28 lg:h-32 lg:w-32 xl:h-[clamp(132px,10vw,168px)] xl:w-[clamp(132px,10vw,168px)]">
        <StaffPhoto staff={staff} />
      </div>
      <div className="flex min-w-0 w-full flex-col items-center pt-3 xl:pt-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold tracking-[-0.05em] text-white transition-colors group-hover:text-accent xl:text-xl xl:group-hover:text-white">
            {staff.name}
          </h3>
          <p className="mt-0.5 truncate text-[9px] text-white/35 sm:text-[10px]">
            {staff.department} · {staff.admissionYear}
          </p>
        </div>
        <p className="mt-0.5 min-w-0 break-keep text-[11px] font-bold leading-snug tracking-[0.02em] text-accent xl:mt-2 xl:min-h-[30px] xl:px-1">
          {staff.position}
        </p>
      </div>
    </article>
  );
}

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

      <div className="relative z-[1] mx-auto w-full max-w-[1440px]">
        <header className="scroll-reveal grid gap-6 pb-7 text-left lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Our team · 14th
            </p>
            <h2 className="mt-3 max-w-4xl text-balance break-keep text-[clamp(32px,4.4vw,60px)] font-semibold leading-[1.14] tracking-[-0.055em] text-white">
              14기를 만드는 사람들
            </h2>
            <p className="mt-4 max-w-3xl break-keep text-sm leading-6 text-white/50 sm:text-base">
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
        ) : featured.length === 0 ? (
          <div className="mt-16 rounded-[24px] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-sm text-white/50">운영진 소개를 준비하고 있어요.</p>
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-7 sm:mt-8 sm:grid-cols-4 sm:gap-x-5 sm:gap-y-5 sm:pt-8 xl:grid-cols-7 xl:gap-4">
            {featured.map((person, index) => (
              <div
                key={person.id}
                className="scroll-reveal member-card-reveal min-w-0"
                style={{ '--reveal-y': `${34 + index * 6}px` } as React.CSSProperties}
              >
                <StaffCard staff={person} />
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
