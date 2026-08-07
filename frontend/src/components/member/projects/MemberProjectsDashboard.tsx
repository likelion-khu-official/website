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
import { chip, dangerGhostButton, listCard, primaryButton, secondaryButton } from '@/components/member/ui/styles';

const MAX_STACK_CHIPS = 4;

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
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-80" />
          ))}
        </div>
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
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id} className={listCard}>
              <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-[#0d0d0d]">
                {project.representativeImageUrl ? (
                  // 프로젝트 화면은 잘라내지 않고 원본 비율 그대로(object-contain) 보여준다.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.representativeImageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[64px] font-semibold text-white/10">
                    {String(project.cohort).padStart(2, '0')}
                  </span>
                )}
                <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-xs font-semibold text-accent backdrop-blur-md">
                  {project.cohort}기
                </span>
                <div className="absolute right-4 top-4">
                  <ProjectVisibilityBadge hidden={project.hidden} />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h2 className="line-clamp-2 break-words text-lg font-semibold leading-tight tracking-[-0.03em] text-white">
                  {project.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">{project.summary}</p>

                {project.techStack.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.techStack.slice(0, MAX_STACK_CHIPS).map((tech) => (
                      <span key={tech} className={chip}>
                        {tech}
                      </span>
                    ))}
                    {project.techStack.length > MAX_STACK_CHIPS ? (
                      <span className={chip}>+{project.techStack.length - MAX_STACK_CHIPS}</span>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 flex items-center gap-1 border-t border-white/10 pt-3">
                  <Link href={`/member/projects/${project.id}/edit`} className={`${secondaryButton} px-4`}>
                    수정
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(project)}
                    disabled={deletingId === project.id}
                    className={`ml-auto ${dangerGhostButton}`}
                  >
                    {deletingId === project.id ? '삭제 중…' : '삭제'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
