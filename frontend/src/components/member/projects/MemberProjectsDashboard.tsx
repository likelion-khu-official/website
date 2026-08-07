'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MemberProjectSummary } from '@shared/types/project';
import { deleteProject, getMemberProjects, MemberApiError } from '@/lib/memberApi';
import { useMemberResource } from '@/components/member/hooks/useMemberResource';
import PageHeader from '@/components/member/ui/PageHeader';
import ErrorAlert from '@/components/member/ui/ErrorAlert';
import EmptyState from '@/components/member/ui/EmptyState';
import { CardGridSkeleton } from '@/components/member/ui/MemberSkeleton';
import { ProjectVisibilityBadge } from '@/components/member/ui/StatusBadge';
import { primaryButton } from '@/components/member/ui/styles';

export default function MemberProjectsDashboard() {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data, setData, loading, error, reload } = useMemberResource<MemberProjectSummary[]>(() =>
    getMemberProjects()
  );

  const projects = data ?? [];

  async function handleDelete(project: MemberProjectSummary) {
    const confirmed = window.confirm(
      `“${project.title}” 프로젝트를 삭제할까요?\n\n삭제하면 DB에서 완전히 제거되며 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    setDeletingId(project.id);
    setDeleteError('');
    try {
      await deleteProject(project.id);
      setData((current) => (current ? current.filter((item) => item.id !== project.id) : current));
    } catch (err) {
      if (
        err instanceof MemberApiError &&
        (err.status === 401 || err.code === 'MUST_CHANGE_PASSWORD')
      ) {
        router.replace('/member/login?returnTo=%2Fmember%2Fprojects');
        return;
      }
      setDeleteError(err instanceof Error ? err.message : '프로젝트 삭제에 실패했어요.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Projects"
        title="내 프로젝트"
        description="내가 참여한 프로젝트를 등록하고 함께 관리할 수 있어요."
        action={
          <Link href="/member/projects/new" className={primaryButton}>
            <span aria-hidden>＋</span> 새 프로젝트
          </Link>
        }
      />

      {error ? <ErrorAlert className="mt-8" message={error} onRetry={reload} /> : null}
      {deleteError ? <ErrorAlert className="mt-8" message={deleteError} /> : null}

      {loading ? (
        <div className="mt-10">
          <CardGridSkeleton count={2} height="h-52" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="아직 참여 중인 프로젝트가 없어요."
          description="새 프로젝트를 등록하면 즉시 공개돼요."
          action={
            <Link href="/member/projects/new" className={primaryButton}>
              <span aria-hidden>＋</span> 첫 프로젝트 등록
            </Link>
          }
        />
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition-colors hover:border-white/20"
            >
              <div className="flex gap-5 p-5">
                <div className="aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-2xl bg-white/[0.05]">
                  {project.representativeImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.representativeImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-accent">{project.cohort}기</span>
                    <ProjectVisibilityBadge hidden={project.hidden} />
                  </div>
                  <h2 className="mt-3 line-clamp-2 break-words text-xl font-semibold leading-tight tracking-[-0.03em] text-white">
                    {project.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">
                    {project.summary}
                  </p>
                </div>
              </div>
              <div className="flex border-t border-white/10">
                <Link
                  href={`/member/projects/${project.id}/edit`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center px-5 py-3.5 text-center text-sm text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  수정
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(project)}
                  disabled={deletingId === project.id}
                  className="min-h-11 flex-1 border-l border-white/10 px-5 py-3.5 text-sm text-red-300/75 transition-colors hover:bg-red-400/[0.06] hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-200 disabled:opacity-40"
                >
                  {deletingId === project.id ? '삭제 중…' : '삭제'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
