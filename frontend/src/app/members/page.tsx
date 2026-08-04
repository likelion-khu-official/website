import type { Metadata } from 'next';
import type { Member } from '@shared/types/member';
import BackLink from '@/components/BackLink';
import MemberCard from '@/components/members/MemberCard';
import { getMembers, getStaff } from '@/lib/rosterApi';
import { mergeRoster } from '@/lib/roster';
import { getBaseUrl } from '@/lib/serverBaseUrl';

export const metadata: Metadata = {
  title: '멤버 — 멋쟁이사자처럼 경희대',
  description: '멋쟁이사자처럼 경희대 14기 멤버들을 소개합니다.',
};

export default async function MembersPage() {
  const baseUrl = await getBaseUrl();
  let members: Member[] = [];
  let failed = false;

  try {
    // 부원(members)과 운영진(staff)을 함께 불러와 하나의 로스터로 합친다.
    // 운영진 중 멤버 테이블에 없는 인물(예: 회장)이 /members에서 누락되던 문제를 막는다.
    const [memberList, staffList] = await Promise.all([getMembers(baseUrl), getStaff(baseUrl)]);
    members = mergeRoster(memberList, staffList);
  } catch {
    failed = true;
  }

  return (
    <main className="mx-auto min-h-[calc(100svh-64px)] w-full max-w-6xl px-5 pb-24 pt-4 sm:px-8 sm:pb-28 sm:pt-6 lg:px-10">
      <div className="mb-5 sm:mb-7">
        <BackLink href="/#members" />
      </div>

      <header className="flex min-w-0 items-end justify-between gap-8 border-b border-white/12 pb-8 sm:pb-10">
        <div className="min-w-0">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            Our members · 14th
          </p>
          <h1 className="max-w-3xl text-balance break-keep text-[clamp(32px,5vw,58px)] font-semibold leading-[1.08] tracking-[-0.05em] text-white">
            함께 배우고 만드는 사람들
          </h1>
          <p className="mt-4 max-w-2xl text-balance break-keep text-sm leading-7 text-white/48 sm:text-[15px]">
            서로 다른 전공과 관심사를 연결해 아이디어를 실제 서비스로 완성합니다.
          </p>
        </div>
        {!failed ? (
          <div className="hidden shrink-0 items-baseline gap-2 sm:flex" aria-label={`${members.length}명의 멤버`}>
            <span className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-white">
              {String(members.length).padStart(2, '0')}
            </span>
            <span className="text-xs uppercase tracking-[0.14em] text-white/35">Members</span>
          </div>
        ) : null}
      </header>

      <section className="mt-7 sm:mt-9" aria-labelledby="members-heading">
        <h2 id="members-heading" className="sr-only">
          전체 멤버
        </h2>
        {failed ? (
          <div className="flex min-h-52 flex-col items-center justify-center border-y border-white/10 px-6 text-center" role="alert">
            <p className="font-medium text-white">멤버 명단을 불러오지 못했어요.</p>
            <p className="mt-2 text-sm text-white/50">잠시 뒤 다시 시도해주세요.</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center border-y border-white/10 px-6 text-center">
            <p className="font-medium text-white">아직 등록된 멤버가 없어요.</p>
            <p className="mt-2 text-sm text-white/50">함께 배우고 만드는 멤버들을 곧 소개할게요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-[38px] sm:gap-y-[38px] md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {members.map((member, index) => (
              <MemberCard key={member.id} member={member} colorIndex={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
