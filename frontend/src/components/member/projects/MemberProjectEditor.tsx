'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { MemberAccount } from '@shared/types/member-auth';
import type { Member } from '@shared/types/member';
import type { ProjectDetail } from '@shared/types/project';
import {
  getAllMembers,
  getCurrentMember,
  getMemberProject,
  MemberApiError,
} from '@/lib/memberApi';
import MemberProjectHeader from './MemberProjectHeader';
import ProjectForm from './ProjectForm';

type Props = {
  projectId?: number;
};

export default function MemberProjectEditor({ projectId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [member, setMember] = useState<MemberAccount | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [project, setProject] = useState<ProjectDetail | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ member: currentMember }, memberList, projectDetail] = await Promise.all([
        getCurrentMember(),
        getAllMembers(),
        projectId ? getMemberProject(projectId) : Promise.resolve(undefined),
      ]);

      if (currentMember.mustChangePassword) {
        router.replace(`/member/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setMember(currentMember);
      setMembers(memberList);
      setProject(projectDetail);
    } catch (loadError) {
      if (loadError instanceof MemberApiError && loadError.status === 401) {
        router.replace(`/member/login?returnTo=${encodeURIComponent(pathname)}`);
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
  }, [pathname, projectId, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <MemberProjectHeader memberName={member?.name} />
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
            className="mt-5 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/65"
          >
            내 프로젝트로 돌아가기
          </button>
        </div>
      ) : member ? (
        <ProjectForm currentMember={member} members={members} initialProject={project} />
      ) : null}
    </div>
  );
}
