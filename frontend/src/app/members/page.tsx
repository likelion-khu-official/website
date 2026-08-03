import type { Metadata } from 'next';
import type { Member } from '@shared/types/member';
import type { ProjectSummary } from '@shared/types/project';
import BackLink from '@/components/BackLink';
import MemberRoster from '@/components/members/MemberRoster';
import { getMembers, getStaff } from '@/lib/rosterApi';
import { getProjects, getProjectById } from '@/lib/projectApi';
import { mergeRoster } from '@/lib/roster';
import { getBaseUrl } from '@/lib/serverBaseUrl';

// 멤버 상세 모달에서 "이 멤버가 참여한 프로젝트"를 보여주려면 memberId→프로젝트 매핑이 필요하다.
// 공개 API엔 그 매핑을 바로 주는 엔드포인트가 없어, 목록(GET /api/projects)과 각 상세
// (participants 포함)를 서버에서 한 번 집계해 만든다. 참여자 memberId는 양수 멤버 id에만
// 매칭되고, staff-only 로스터 항목은 음수 id라 자연히 프로젝트가 없다.
async function buildProjectsByMember(
  baseUrl: string,
): Promise<Record<number, ProjectSummary[]>> {
  const summaries = await getProjects(baseUrl);
  const details = await Promise.all(summaries.map((project) => getProjectById(project.id, baseUrl)));
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary]));

  const byMember: Record<number, ProjectSummary[]> = {};
  for (const detail of details) {
    if (!detail) continue;
    const summary = summaryById.get(detail.id);
    if (!summary) continue;
    for (const participant of detail.participants) {
      (byMember[participant.memberId] ??= []).push(summary);
    }
  }
  return byMember;
}

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

  // 프로젝트 집계는 멤버 목록과 독립적으로 처리한다 — 프로젝트가 실패해도 멤버 그리드는 그대로 보이고,
  // 모달에서만 "프로젝트 정보를 불러오지 못했어요"로 안내한다.
  let projectsByMember: Record<number, ProjectSummary[]> = {};
  let projectsUnavailable = false;
  try {
    projectsByMember = await buildProjectsByMember(baseUrl);
  } catch {
    projectsUnavailable = true;
  }

  return (
    <main className="relative min-h-[calc(100svh-64px)] overflow-hidden bg-background px-5 pb-24 pt-4 sm:px-10 lg:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_50%_-10%,rgba(255,80,0,0.3),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[1320px]">
        <BackLink href="/#members" />

        <header className="pb-12 pt-6 text-center sm:pb-16 sm:pt-10">
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
          <MemberRoster
            members={members}
            projectsByMember={projectsByMember}
            projectsUnavailable={projectsUnavailable}
          />
        )}
      </div>
    </main>
  );
}
