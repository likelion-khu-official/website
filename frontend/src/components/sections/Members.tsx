import Link from 'next/link';
import type { Staff } from '@shared/types/staff';
import { getStaff } from '@/lib/rosterApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

function StaffPhoto({ staff }: { staff: Staff }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-[14px] bg-gradient-to-br from-[#3f251d] to-[#1b1716]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={staff.photoUrl} alt={`${staff.name} 프로필`} className="h-full w-full object-cover" />
    </div>
  );
}

// 회장·세션장을 같은 레벨의 카드로 통일한다. 겸임(부회장·AI 세션장 등)도 카드 하나로 흡수.
// 모바일은 가로형(사진 왼쪽)으로 한 열에 하나씩 — 홀수 인원이어도 빈칸이 안 생긴다.
// 데스크톱은 세로형(사진 위)으로 한 줄에 나란히.
function StaffCard({ staff }: { staff: Staff }) {
  return (
    <article className="flex h-full flex-row items-start gap-4 rounded-[20px] border border-accent/25 bg-black/25 p-3.5 backdrop-blur transition-colors hover:border-accent/40 lg:flex-col lg:items-stretch lg:gap-0">
      <div className="aspect-[4/5] w-[92px] shrink-0 min-[400px]:w-[108px] lg:w-full">
        <StaffPhoto staff={staff} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col lg:px-1 lg:pt-3.5">
        <p className="text-[11.5px] font-bold tracking-[0.01em] text-accent">{staff.position}</p>
        <h3 className="mt-1.5 text-xl font-bold tracking-[-0.05em] text-white">{staff.name}</h3>
        <p className="mt-0.5 text-[11px] text-white/35">
          {staff.department} · {staff.admissionYear}학번
        </p>
        {staff.activities?.length ? (
          <div className="mt-3 border-t border-white/10 pt-3 lg:mt-3.5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">활동</p>
            <ul className="grid gap-2">
              {staff.activities.map((activity, index) => (
                <li
                  key={index}
                  className="relative pl-4 text-[12px] leading-[1.4] text-white/60 before:absolute before:left-0 before:top-[7px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-accent"
                >
                  {activity}
                </li>
              ))}
            </ul>
          </div>
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

  // 랜딩은 대표·세션 리드(상위 다섯 직무)만 티저로 보여주고, 전체는 /members로.
  const featured = staff.slice(0, 5);

  return (
    <section
      id="members"
      className="members-bg relative flex min-h-screen min-h-[100svh] w-full flex-col justify-center overflow-hidden px-5 pb-12 pt-24 sm:px-10 sm:pb-14 sm:pt-28 lg:px-16 lg:pb-8 lg:pt-24"
    >
      <div className="members-glow-base" />
      <div className="members-glow-accent" />

      <div className="relative z-[1] mx-auto max-w-[1390px]">
        <header className="scroll-reveal flex flex-col items-center gap-4 text-center">
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
        ) : featured.length === 0 ? (
          <div className="mt-16 rounded-[24px] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-sm text-white/50">운영진 소개를 준비하고 있어요.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
            {featured.map((person, index) => (
              <div
                key={person.id}
                className="scroll-reveal member-card-reveal min-w-0"
                style={{ '--reveal-y': `${34 + (index % 5) * 10}px` } as React.CSSProperties}
              >
                <StaffCard staff={person} />
              </div>
            ))}
          </div>
        )}

        <div className="scroll-reveal mt-6 text-center">
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
