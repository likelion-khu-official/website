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
import { Skeleton } from '@/components/member/ui/MemberSkeleton';
import { ProjectVisibilityBadge } from '@/components/member/ui/StatusBadge';
import Thumb from '@/components/member/ui/Thumb';
import { dangerGhostButton, primaryButton, rowAction, rowCard } from '@/components/member/ui/styles';
import { monogram } from '@/components/member/ui/monogram';

const MAX_STACK_CHIPS = 3;

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
        <ul className="mt-8 flex flex-col gap-3">
          {[0, 1, 2, 3].map((item) => (
            <li key={item}>
              <Skeleton className="h-[104px] rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : projects.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="아직 참여 중인 프로젝트가 없어요."
            description="새 프로젝트를 등록하면 즉시 공개돼요."
            action={
              <Link href="/member/projects/new" className={primaryButton}>
                <span aria-hidden>＋</span> 첫 프로젝트 등록
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {projects.map((project) => (
            <li key={project.id} className={rowCard}>
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Thumb
                  src={project.representativeImageUrl}
                  fit="contain"
                  fallback={<span className="text-lg sm:text-xl">{monogram(project.title)}</span>}
                  className="h-16 w-16 sm:h-[72px] sm:w-[72px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40">
                    <span className="font-semibold text-accent">{project.cohort}기</span>
                    <ProjectVisibilityBadge hidden={project.hidden} />
                    {project.techStack.length > 0 ? (
                      <span className="min-w-0 truncate text-white/40">
                        {project.techStack.slice(0, MAX_STACK_CHIPS).join(' · ')}
                        {project.techStack.length > MAX_STACK_CHIPS
                          ? ` +${project.techStack.length - MAX_STACK_CHIPS}`
                          : ''}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-1.5 truncate text-[15px] font-semibold tracking-[-0.02em] text-white sm:text-base">
                    {project.title}
                  </h2>
                  {project.summary ? (
                    <p className="mt-1 truncate text-sm text-white/45">{project.summary}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-1 border-t border-white/[0.06] pt-3 sm:border-0 sm:pt-0 sm:pl-2">
                <Link href={`/member/projects/${project.id}/edit`} className={rowAction}>
                  수정
                </Link>
                {!project.hidden ? (
                  <Link href={`/projects/${project.id}`} className={rowAction}>
                    공개 페이지 <span aria-hidden>↗</span>
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleDelete(project)}
                  disabled={deletingId === project.id}
                  className={`ml-auto sm:ml-1 ${dangerGhostButton}`}
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
