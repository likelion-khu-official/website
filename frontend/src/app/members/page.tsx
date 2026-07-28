import type { Metadata } from 'next';
import Link from 'next/link';
import type { Member } from '@shared/types/member';
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
    <main className="relative min-h-screen min-h-[100svh] overflow-hidden bg-background px-5 pb-24 pt-8 sm:px-10 lg:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_50%_-10%,rgba(255,80,0,0.3),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[1320px]">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-white/55 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden>←</span>
          홈으로
        </Link>

        <header className="pb-12 pt-16 text-center sm:pb-16 sm:pt-24">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent">OUR MEMBERS</p>
          <h1 className="mt-4 text-balance break-keep text-[clamp(36px,5vw,72px)] font-bold tracking-[-0.055em] text-white">
            함께 배우고 만드는 사람들
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance break-keep text-sm leading-7 text-white/55 sm:text-base">
            서로 다른 전공과 관심사를 연결해 아이디어를 실제 서비스로 완성합니다.
          </p>
        </header>

        {failed ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] py-24 text-center">
            <p className="text-sm text-white/50">멤버 명단을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.</p>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] py-24 text-center">
            <p className="text-sm text-white/50">아직 등록된 멤버가 없어요.</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 justify-center gap-x-3 gap-y-8 sm:grid-cols-[repeat(auto-fit,minmax(144px,156px))] sm:gap-x-[38px] sm:gap-y-[38px]"
          >
            {members.map((member, index) => (
              <MemberCard key={member.id} member={member} colorIndex={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
