'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MemberAccount } from '@shared/types/member-auth';
import type { Member } from '@shared/types/member';
import type { MemberPostSummary } from '@shared/types/feed';
import type { MemberProjectSummary } from '@shared/types/project';
import { formatDate } from '@/lib/formatDate';
import { ROLE_LABELS } from '@/lib/roster';
import { getMemberPosts, getMemberProjects, getMyProfile, MemberApiError } from '@/lib/memberApi';
import { useMemberSession } from '@/components/member/MemberShell';

const PREVIEW_SIZE = 3;

function postStatusStyle(status: MemberPostSummary['status']) {
  if (status === 'PUBLISHED') return 'bg-emerald-400/10 text-emerald-300';
  if (status === 'HIDDEN') return 'bg-amber-400/10 text-amber-300';
  return 'bg-white/10 text-white/55';
}

function postStatusLabel(status: MemberPostSummary['status']) {
  if (status === 'PUBLISHED') return '공개';
  if (status === 'HIDDEN') return '숨김';
  return '초안';
}

type DashboardData = {
  profile: Member;
  posts: MemberPostSummary[];
  postsTotal: number;
  projects: MemberProjectSummary[];
};

export default function MemberDashboard() {
  const router = useRouter();
  const member = useMemberSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profile, postPage, projects] = await Promise.all([
        getMyProfile(),
        getMemberPosts(0, PREVIEW_SIZE),
        getMemberProjects(),
      ]);
      setData({
        profile,
        posts: postPage.content,
        postsTotal: postPage.totalElements,
        projects,
      });
    } catch (err) {
      if (err instanceof MemberApiError && err.status === 401) {
        router.replace(`/member/login?returnTo=${encodeURIComponent('/member')}`);
        return;
      }
      setError(err instanceof Error ? err.message : '대시보드를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="border-b border-white/10 pb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Member workspace
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
          내 활동
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/45">
          내 프로필·글·프로젝트 상태를 한눈에 보고 필요한 화면으로 이동해요.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-8 flex flex-col items-start justify-between gap-2 rounded-2xl border border-red-400/20 bg-red-400/[0.07] px-5 py-4 text-sm text-red-200 sm:flex-row sm:items-center sm:gap-4"
        >
          <span className="min-w-0 break-words">{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {loading ? (
        <>
          <div className="mt-10 h-28 animate-pulse rounded-3xl border border-white/5 bg-white/[0.035]" />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-3xl border border-white/5 bg-white/[0.035]"
              />
            ))}
          </div>
        </>
      ) : data ? (
        <>
          <IdentityCard member={member} profile={data.profile} />

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

function IdentityCard({ member, profile }: { member: MemberAccount; profile: Member }) {
  return (
    <div className="mt-10 flex flex-col items-start gap-5 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:flex-row sm:items-center">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.05]">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl" aria-hidden>
            {profile.emoji}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold tracking-[-0.03em] text-white">{member.name} 님</p>
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
    <div className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.025] p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">{title}</h2>
        <span className="text-xs text-white/40">{meta}</span>
      </div>
      <div className="mt-4 flex-1">{children}</div>
      <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4">
        <Link
          href={href}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-white transition hover:bg-[#ff6a26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {hrefLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 text-sm text-white/65 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
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
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${postStatusStyle(post.status)}`}
                >
                  {postStatusLabel(post.status)}
                </span>
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
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    project.hidden ? 'bg-amber-400/10 text-amber-300' : 'bg-emerald-400/10 text-emerald-300'
                  }`}
                >
                  {project.hidden ? '숨김' : '공개'}
                </span>
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
    <DashboardCard title="내 프로필" meta={profile.joinReason ? '작성됨' : '미작성'} href="/member/profile" hrefLabel="프로필 편집">
      <p className="line-clamp-4 text-sm leading-6 text-white/60">
        {profile.joinReason || '입부계기를 아직 적지 않았어요. 편집에서 나를 소개해보세요.'}
      </p>
    </DashboardCard>
  );
}
