import Link from 'next/link';
import type { Staff } from '@shared/types/staff';
import { getStaff } from '@/lib/rosterApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

function StaffPhoto({ staff }: { staff: Staff }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-[18px] bg-gradient-to-br from-[#3f251d] to-[#1b1716]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={staff.photoUrl} alt={`${staff.name} 프로필`} className="h-full w-full object-cover" />
    </div>
  );
}

function LeaderCard({ staff }: { staff: Staff }) {
  return (
    <article className="grid grid-cols-1 gap-5 rounded-[24px] border border-accent/25 bg-black/25 p-4 backdrop-blur sm:grid-cols-[minmax(180px,38%)_1fr] sm:p-5">
      <div className="aspect-[4/3] sm:aspect-auto sm:min-h-[260px]">
        <StaffPhoto staff={staff} />
      </div>
      <div className="flex min-w-0 flex-col justify-center py-2">
        <p className="text-sm font-semibold text-accent">{staff.position}</p>
        <h3 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-white">{staff.name}</h3>
        <p className="mt-2 text-xs text-white/45">
          {staff.department} · {staff.admissionYear}학번
        </p>
        {staff.introduction ? (
          <p className="mt-5 break-keep text-sm leading-6 text-white/65">{staff.introduction}</p>
        ) : null}
      </div>
    </article>
  );
}

function StaffCard({ staff }: { staff: Staff }) {
  return (
    <article className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-[22px] border border-accent/20 bg-black/25 p-3 backdrop-blur min-[360px]:grid-cols-[96px_minmax(0,1fr)] min-[360px]:gap-4 min-[360px]:p-4 sm:grid-cols-[132px_minmax(0,1fr)]">
      <div className="aspect-square sm:aspect-[4/5]">
        <StaffPhoto staff={staff} />
      </div>
      <div className="flex min-w-0 flex-col justify-center py-1">
        <p className="text-xs font-semibold text-accent">{staff.position}</p>
        <h3 className="mt-1.5 text-xl font-bold tracking-[-0.04em] text-white">{staff.name}</h3>
        <p className="mt-1 text-[11px] text-white/40">
          {staff.department} · {staff.admissionYear}학번
        </p>
        {staff.introduction ? (
          <p className="mt-3 break-keep text-xs leading-5 text-white/55">{staff.introduction}</p>
        ) : null}
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

  const leaders = staff.slice(0, 2);
  const team = staff.slice(2);

  return (
    <section
      id="members"
      className="members-bg relative min-h-screen min-h-[100svh] w-full overflow-hidden px-5 py-20 sm:px-10 sm:py-24 lg:px-16"
    >
      <div className="members-glow-base" />
      <div className="members-glow-accent" />

      <div className="relative z-[1] mx-auto max-w-[1390px]">
        <header className="flex flex-col items-center gap-4 text-center">
          <p className="text-white" style={{ fontSize: 'clamp(22px, 2.3vw, 40px)', letterSpacing: '-1.6px' }}>
            운영진 소개
          </p>
          <p
            className="max-w-[1000px] text-balance break-keep font-semibold text-accent"
            style={{ fontSize: 'clamp(22px, 2.8vw, 48px)', letterSpacing: '-1.92px' }}
          >
            경희대학교 멋쟁이사자처럼 14기 운영진을 소개합니다.
          </p>
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
          <>
            <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {leaders.map((person) => (
                <LeaderCard key={person.id} staff={person} />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              {team.map((person) => (
                <StaffCard key={person.id} staff={person} />
              ))}
            </div>
          </>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/members"
            className="inline-flex min-h-11 items-center rounded-full border border-accent/35 bg-accent/10 px-6 py-3 text-sm font-semibold text-accent outline-none transition-colors hover:bg-accent hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            14기 멤버 전체 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
