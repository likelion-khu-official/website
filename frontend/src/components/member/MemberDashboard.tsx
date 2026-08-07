'use client';

import Link from 'next/link';
import type { Member } from '@shared/types/member';
import type { MemberPostSummary } from '@shared/types/feed';
import type { MemberProjectSummary } from '@shared/types/project';
import { formatDate } from '@/lib/formatDate';
import { ROLE_LABELS } from '@/lib/roster';
import { getMemberPosts, getMemberProjects, getMyProfile } from '@/lib/memberApi';
import { useMemberResource } from './hooks/useMemberResource';
import PageHeader from './ui/PageHeader';
import ErrorAlert from './ui/ErrorAlert';
import { Skeleton } from './ui/MemberSkeleton';
import { PostStatusBadge, ProjectVisibilityBadge } from './ui/StatusBadge';
import { cardSurface, primaryButton, secondaryButton } from './ui/styles';

const PREVIEW_SIZE = 3;

type DashboardData = {
  profile: Member;
  posts: MemberPostSummary[];
  postsTotal: number;
  projects: MemberProjectSummary[];
};

export default function MemberDashboard() {
  const { data, loading, error, reload } = useMemberResource<DashboardData>(async () => {
    const [profile, postPage, projects] = await Promise.all([
      getMyProfile(),
      getMemberPosts(0, PREVIEW_SIZE),
      getMemberProjects(),
    ]);
    return { profile, posts: postPage.content, postsTotal: postPage.totalElements, projects };
  });

  return (
    <div>
      <PageHeader
        kicker="Member workspace"
        title="내 활동"
        description="내 프로필·글·프로젝트 상태를 한눈에 보고 필요한 화면으로 이동해요."
      />

      {error ? <ErrorAlert className="mt-8" message={error} onRetry={reload} /> : null}

      {loading ? (
        <>
          <Skeleton className="mt-10 h-28" />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-64" />
            ))}
          </div>
        </>
      ) : data ? (
        <>
          <IdentityCard profile={data.profile} />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <PostsCard posts={data.posts} total={data.postsTotal} />
            <ProjectsCard projects={data.projects} />
            <ProfileCard profile={data.profile} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function IdentityCard({ profile }: { profile: Member }) {
  return (
    <div className={`mt-10 flex flex-col items-start gap-5 ${cardSurface} p-6 sm:flex-row sm:items-center`}>
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.05]">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl" aria-hidden>
            {profile.emoji || '🦁'}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold tracking-[-0.03em] text-white">{profile.name} 님</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-accent">{profile.cohort}기</span>
          {profile.roles.map((role) => (
            <span key={role} className="rounded-full bg-white/[0.06] px-2 py-1 text-white/60">
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  meta,
  href,
  hrefLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: {
  title: string;
  meta: string;
  href: string;
  hrefLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${cardSurface} p-6`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">{title}</h2>
        <span className="text-xs text-white/40">{meta}</span>
      </div>
      <div className="mt-4 flex-1">{children}</div>
      <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4">
        <Link href={href} className={`${primaryButton} px-4`}>
          {hrefLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className={`${secondaryButton} px-4`}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function PostsCard({ posts, total }: { posts: MemberPostSummary[]; total: number }) {
  return (
    <DashboardCard
      title="내 글"
      meta={`총 ${total}편`}
      href="/member/write"
      hrefLabel="새 글 쓰기"
      secondaryHref="/member/posts"
      secondaryLabel="내 글 관리"
    >
      {posts.length === 0 ? (
        <p className="text-sm text-white/40">아직 쓴 글이 없어요. 첫 글을 남겨보세요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id} className="min-w-0">
              <div className="flex items-center gap-2">
                <PostStatusBadge status={post.status} />
                <span className="truncate text-sm text-white/80">{post.title}</span>
              </div>
              <p className="mt-1 text-xs text-white/35">
                {formatDate(post.publishedAt ?? post.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

function ProjectsCard({ projects }: { projects: MemberProjectSummary[] }) {
  const preview = projects.slice(0, PREVIEW_SIZE);
  return (
    <DashboardCard
      title="내 프로젝트"
      meta={`총 ${projects.length}개`}
      href="/member/projects/new"
      hrefLabel="새 프로젝트 등록"
      secondaryHref="/member/projects"
      secondaryLabel="내 프로젝트 관리"
    >
      {preview.length === 0 ? (
        <p className="text-sm text-white/40">아직 등록한 프로젝트가 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {preview.map((project) => (
            <li key={project.id} className="min-w-0">
              <div className="flex items-center gap-2">
                <ProjectVisibilityBadge hidden={project.hidden} />
                <span className="truncate text-sm text-white/80">{project.title}</span>
              </div>
              <p className="mt-1 text-xs text-white/35">{project.cohort}기</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

function ProfileCard({ profile }: { profile: Member }) {
  return (
    <DashboardCard
      title="내 프로필"
      meta={profile.joinReason ? '작성됨' : '미작성'}
      href="/member/profile"
      hrefLabel="프로필 편집"
    >
      <p className="line-clamp-4 text-sm leading-6 text-white/60">
        {profile.joinReason || '입부계기를 아직 적지 않았어요. 편집에서 나를 소개해보세요.'}
      </p>
    </DashboardCard>
  );
}
