import Link from 'next/link';
import type { ProjectSummary } from '@shared/types/project';
import ProjectCard from './ProjectCard';

type Props = {
  projects: ProjectSummary[];
  failed?: boolean;
};

function GalleryState({ failed }: { failed: boolean }) {
  return (
    <div
      className="flex min-h-52 flex-col items-center justify-center border-y border-white/10 px-6 text-center"
      role={failed ? 'alert' : undefined}
    >
      <p className="font-medium text-white">
        {failed ? '프로젝트를 불러오지 못했어요.' : '아직 등록된 프로젝트가 없어요.'}
      </p>
      <p className="mt-2 text-sm text-white/50">
        {failed ? '잠시 후 다시 시도해 주세요.' : '새 프로젝트를 준비하고 있습니다.'}
      </p>
      {failed ? (
        <Link
          href="/projects"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-medium text-white outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent"
        >
          다시 불러오기
        </Link>
      ) : null}
    </div>
  );
}

export default function ProjectsGallery({ projects, failed = false }: Props) {
  return (
    <>
      <h2 id="projects-heading" className="sr-only">
        전체 프로젝트
      </h2>

      {failed || projects.length === 0 ? (
        <GalleryState failed={failed} />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-12">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} priority={index < 3} />
          ))}
        </div>
      )}
    </>
  );
}
