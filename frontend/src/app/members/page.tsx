import type { Metadata } from 'next';
import type { Member } from '@shared/types/member';
import type { PostSummary } from '@shared/types/feed';
import BackLink from '@/components/BackLink';
import MemberRoster from '@/components/members/MemberRoster';
import { getMembers, getStaff } from '@/lib/rosterApi';
import { getProjects, getProjectById } from '@/lib/projectApi';
import { getPosts } from '@/lib/feedApi';
import {
  groupMemberActivities,
  type ProjectWithDetail,
} from '@/lib/memberActivity';
import { mergeRoster } from '@/lib/roster';
import { getBaseUrl } from '@/lib/serverBaseUrl';

const POST_PAGE_SIZE = 100;

// 프로젝트 목록엔 참여자가 없으므로 상세를 함께 불러와 멤버별 활동에 연결한다.
// 20명 안팎인 현재 규모에서는 별도 활동 API를 추가하는 것보다 기존 공개 계약을 조합하는 편이 단순하다.
async function getProjectsWithDetails(baseUrl: string): Promise<ProjectWithDetail[]> {
  const summaries = await getProjects(baseUrl);
  const details = await Promise.all(summaries.map((project) => getProjectById(project.id, baseUrl)));
  return details.flatMap((detail, index) => (
    detail ? [{ summary: summaries[index], detail }] : []
  ));
}

// 기본 공개 목록은 10개 단위지만 멤버 활동에는 공개 글 전체가 필요하다.
// 먼저 한 페이지를 받고 남은 페이지는 병렬로 읽어 월 2건 규모에서도 요청 수를 제한한다.
async function getAllPublishedPosts(baseUrl: string): Promise<PostSummary[]> {
  const first = await getPosts(0, baseUrl, POST_PAGE_SIZE);
  if (first.totalPages <= 1) return first.content;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) => (
      getPosts(index + 1, baseUrl, POST_PAGE_SIZE)
    )),
  );
  return [first, ...rest].flatMap((page) => page.content);
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

  // 두 활동 소스는 서로 독립적으로 읽는다. 한쪽이 실패해도 다른 쪽 활동과 멤버 그리드는 유지한다.
  const [projectsResult, postsResult] = await Promise.allSettled([
    getProjectsWithDetails(baseUrl),
    getAllPublishedPosts(baseUrl),
  ]);
  const projectActivities = projectsResult.status === 'fulfilled' ? projectsResult.value : [];
  const postActivities = postsResult.status === 'fulfilled' ? postsResult.value : [];
  const activitiesIncomplete = projectsResult.status === 'rejected' || postsResult.status === 'rejected';
  const activitiesByMember = groupMemberActivities(postActivities, projectActivities);

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
          <div
            className="hidden shrink-0 items-baseline gap-2 sm:flex"
            aria-label={`${members.length}명의 멤버`}
          >
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
          <div
            className="flex min-h-52 flex-col items-center justify-center border-y border-white/10 px-6 text-center"
            role="alert"
          >
            <p className="font-medium text-white">멤버 명단을 불러오지 못했어요.</p>
            <p className="mt-2 text-sm text-white/50">잠시 뒤 다시 시도해주세요.</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center border-y border-white/10 px-6 text-center">
            <p className="font-medium text-white">아직 등록된 멤버가 없어요.</p>
            <p className="mt-2 text-sm text-white/50">
              함께 배우고 만드는 멤버들을 곧 소개할게요.
            </p>
          </div>
        ) : (
          <MemberRoster
            members={members}
            activitiesByMember={activitiesByMember}
            activitiesIncomplete={activitiesIncomplete}
          />
        )}
      </section>
    </main>
  );
}
