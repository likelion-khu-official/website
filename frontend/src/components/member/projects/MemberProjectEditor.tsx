'use client';

import { useRouter } from 'next/navigation';
import type { MemberAccount } from '@shared/types/member-auth';
import type { Member } from '@shared/types/member';
import type { ProjectDetail } from '@shared/types/project';
import { getAllMembers, getCurrentMember, getMemberProject } from '@/lib/memberApi';
import { useMemberResource } from '@/components/member/hooks/useMemberResource';
import PageHeader from '@/components/member/ui/PageHeader';
import { Skeleton } from '@/components/member/ui/MemberSkeleton';
import { cardSurface, secondaryButton } from '@/components/member/ui/styles';
import ProjectForm from './ProjectForm';

type Props = {
  projectId?: number;
};

type EditorData = {
  currentMember: MemberAccount;
  members: Member[];
  project?: ProjectDetail;
};

export default function MemberProjectEditor({ projectId }: Props) {
  const router = useRouter();

  const { data, loading, error } = useMemberResource<EditorData>(
    async () => {
      const [{ member: currentMember }, members, project] = await Promise.all([
        getCurrentMember(),
        getAllMembers(),
        projectId ? getMemberProject(projectId) : Promise.resolve(undefined),
      ]);
      return { currentMember, members, project };
    },
    [projectId],
    {
      mapError: (err) => {
        if (err.code === 'NOT_PARTICIPANT') return '이 프로젝트에 참여한 멤버만 수정할 수 있어요.';
        if (err.status === 404) return '프로젝트를 찾을 수 없어요.';
        return null;
      },
    }
  );

  return (
    <div>
      <PageHeader
        kicker={projectId ? 'Edit project' : 'New project'}
        title={projectId ? '프로젝트 수정' : '새 프로젝트 등록'}
        description={
          projectId
            ? '함께 만든 멤버라면 누구나 최신 정보로 고칠 수 있어요.'
            : '팀의 결과물을 등록하면 방문자에게 바로 공개돼요.'
        }
      />

      {loading ? (
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-[620px]" />
          <Skeleton className="h-72" />
        </div>
      ) : error ? (
        <div className={`mt-12 flex min-h-72 flex-col items-center justify-center ${cardSurface} px-6 text-center`}>
          <p className="text-lg font-semibold text-white">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/member/projects')}
            className={`mt-5 ${secondaryButton}`}
          >
            내 프로젝트로 돌아가기
          </button>
        </div>
      ) : data ? (
        <ProjectForm
          currentMember={data.currentMember}
          members={data.members}
          initialProject={data.project}
        />
      ) : null}
    </div>
  );
}
