'use client';

import Link from 'next/link';
import type { Member } from '@shared/types/member';
import type { MemberPostSummary } from '@shared/types/feed';
import type { MemberProjectSummary } from '@shared/types/project';
import { formatRelativeTime } from '@/lib/formatDate';
import { ROLE_LABELS } from '@/lib/roster';
import { getMemberPosts, getMemberProjects, getMyProfile } from '@/lib/memberApi';
import { useMemberResource } from './hooks/useMemberResource';
import ErrorAlert from './ui/ErrorAlert';
import EmptyState from './ui/EmptyState';
import { Skeleton } from './ui/MemberSkeleton';
import { PostStatusBadge, ProjectVisibilityBadge } from './ui/StatusBadge';
import { cardSurface, primaryButton, secondaryButton } from './ui/styles';

const ACTIVITY_FETCH = 6;
const ACTIVITY_SHOWN = 6;

type DashboardData = {
  profile: Member;
  posts: MemberPostSummary[];
  postsTotal: number;
  projects: MemberProjectSummary[];
};

type Activity =
  | { kind: 'post'; id: number; title: string; createdAt: string; post: MemberPostSummary }
  | { kind: 'project'; id: number; title: string; createdAt: string; project: MemberProjectSummary };

export default function MemberDashboard() {
  const { data, loading, error, reload } = useMemberResource<DashboardData>(async () => {
    const [profile, postPage, projects] = await Promise.all([
      getMyProfile(),
      getMemberPosts(0, ACTIVITY_FETCH),
      getMemberProjects(),
    ]);
    return { profile, posts: postPage.content, postsTotal: postPage.totalElements, projects };
  });

  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  if (loading || !data) return <DashboardSkeleton />;

  const activities = buildActivities(data.posts, data.projects);

  return (
    <div className="flex flex-col gap-8">
      <WelcomeHero profile={data.profile} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile href="/member/posts" label="내 글" value={`${data.postsTotal}`} unit="편" />
        <StatTile
          href="/member/projects"
          label="내 프로젝트"
          value={`${data.projects.length}`}
          unit="개"
        />
        <StatTile
          href="/member/profile"
          label="프로필"
          value={data.profile.joinReason ? '작성됨' : '미작성'}
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">최근 활동</h2>
        {activities.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="아직 활동 기록이 없어요."
              description="첫 글이나 프로젝트를 남기면 여기에 모여요."
              action={
                <Link href="/member/write" className={primaryButton}>
                  <span aria-hidden>＋</span> 첫 글 쓰기
                </Link>
              }
            />
          </div>
        ) : (
          <ul className={`mt-4 divide-y divide-white/5 overflow-hidden ${cardSurface}`}>
            {activities.map((activity) => (
              <ActivityRow key={`${activity.kind}-${activity.id}`} activity={activity} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function buildActivities(posts: MemberPostSummary[], projects: MemberProjectSummary[]): Activity[] {
  const items: Activity[] = [
    ...posts.map(
      (post): Activity => ({
        kind: 'post',
        id: post.id,
        title: post.title,
        createdAt: post.createdAt,
        post,
      })
    ),
    ...projects.map(
      (project): Activity => ({
        kind: 'project',
        id: project.id,
        title: project.title,
        createdAt: project.createdAt,
        project,
      })
    ),
  ];
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, ACTIVITY_SHOWN);
}

function WelcomeHero({ profile }: { profile: Member }) {
  return (
    <section className="member-hero-bg relative overflow-hidden rounded-3xl border border-white/10 p-7 sm:p-10">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl" aria-hidden>
              {profile.emoji || '🦁'}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            안녕하세요, {profile.name} 님 🦁
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/55">
            <span className="text-accent">{profile.cohort}기</span>
            {profile.roles.map((role) => (
              <span key={role} className="rounded-full bg-white/[0.06] px-2 py-0.5">
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-white/55">
        내가 만든 글과 프로젝트가 이 공간에 모여요. 새 활동을 바로 남겨보세요.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/member/write" className={primaryButton}>
          <span aria-hidden>＋</span> 새 글 쓰기
        </Link>
        <Link href="/member/projects/new" className={secondaryButton}>
          <span aria-hidden>＋</span> 새 프로젝트
        </Link>
      </div>
    </section>
  );
}

function StatTile({
  href,
  label,
  value,
  unit,
}: {
  href: string;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between gap-3 ${cardSurface} px-5 py-4 transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      <div className="min-w-0">
        <p className="text-xs text-white/45">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">
          {value}
          {unit ? <span className="ml-1 text-sm font-normal text-white/40">{unit}</span> : null}
        </p>
      </div>
      <span
        aria-hidden
        className="text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50"
      >
        →
      </span>
    </Link>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const href =
    activity.kind === 'post'
      ? `/member/posts/${activity.id}/edit`
      : `/member/projects/${activity.id}/edit`;

  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        {activity.kind === 'post' ? (
          <PostStatusBadge status={activity.post.status} />
        ) : (
          <ProjectVisibilityBadge hidden={activity.project.hidden} />
        )}
        <span className="shrink-0 text-xs text-white/35">
          {activity.kind === 'post' ? '글' : '프로젝트'}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-white/80">{activity.title}</span>
        <span className="shrink-0 text-xs text-white/35">{formatRelativeTime(activity.createdAt)}</span>
      </Link>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-20 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
