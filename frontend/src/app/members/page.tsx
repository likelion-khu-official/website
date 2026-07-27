import type { Metadata } from 'next';
import Link from 'next/link';
import type { Member } from '@shared/types/member';
import MemberCard from '@/components/members/MemberCard';
import { getMembers } from '@/lib/rosterApi';
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
    members = await getMembers(baseUrl);
  } catch {
    failed = true;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 pb-24 pt-8 sm:px-10 lg:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_50%_-10%,rgba(255,80,0,0.3),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[1320px]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
        >
          <span aria-hidden>←</span>
          홈으로
        </Link>

        <header className="pb-12 pt-16 text-center sm:pb-16 sm:pt-24">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent">OUR MEMBERS</p>
          <h1 className="mt-4 text-[clamp(36px,5vw,72px)] font-bold tracking-[-0.055em] text-white">
            함께 배우고 만드는 사람들
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
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
            className="grid grid-cols-[repeat(2,156px)] justify-center gap-y-[38px] sm:grid-cols-[repeat(auto-fit,156px)]"
            style={{ columnGap: 'clamp(8px, calc(100vw - 352px), 38px)' }}
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
