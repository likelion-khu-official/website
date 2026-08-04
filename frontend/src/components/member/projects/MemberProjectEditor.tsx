'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Member } from '@shared/types/member';
import type { ProjectDetail } from '@shared/types/project';
import { getAllMembers, getMemberProject, MemberApiError } from '@/lib/memberApi';
import { useMemberSession } from '@/components/member/MemberShell';
import ProjectForm from './ProjectForm';

type Props = {
  projectId?: number;
};

export default function MemberProjectEditor({ projectId }: Props) {
  const router = useRouter();
  const member = useMemberSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [project, setProject] = useState<ProjectDetail | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [memberList, projectDetail] = await Promise.all([
        getAllMembers(),
        projectId ? getMemberProject(projectId) : Promise.resolve(undefined),
      ]);
      setMembers(memberList);
      setProject(projectDetail);
    } catch (loadError) {
      if (loadError instanceof MemberApiError && loadError.status === 401) {
        const pagePath = projectId ? `/member/projects/${projectId}/edit` : '/member/projects/new';
        router.replace(`/member/login?returnTo=${encodeURIComponent(pagePath)}`);
        return;
      }
      if (loadError instanceof MemberApiError && loadError.code === 'NOT_PARTICIPANT') {
        setError('이 프로젝트에 참여한 멤버만 수정할 수 있어요.');
      } else if (loadError instanceof MemberApiError && loadError.status === 404) {
        setError('프로젝트를 찾을 수 없어요.');
      } else {
        setError(loadError instanceof Error ? loadError.message : '화면을 준비하지 못했어요.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="border-b border-white/10 pb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          {projectId ? 'Edit project' : 'New project'}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
          {projectId ? '프로젝트 수정' : '새 프로젝트 등록'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/45">
          {projectId
            ? '함께 만든 멤버라면 누구나 최신 정보로 고칠 수 있어요.'
            : '팀의 결과물을 등록하면 방문자에게 바로 공개돼요.'}
        </p>
      </div>

      {loading ? (
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="h-[620px] animate-pulse rounded-3xl bg-white/[0.035]" />
          <div className="h-72 animate-pulse rounded-3xl bg-white/[0.035]" />
        </div>
      ) : error ? (
        <div className="mt-12 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025] px-6 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/member/projects')}
            className="mt-5 min-h-11 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            내 프로젝트로 돌아가기
          </button>
        </div>
      ) : (
        <ProjectForm currentMember={member} members={members} initialProject={project} />
      )}
    </div>
  );
}
