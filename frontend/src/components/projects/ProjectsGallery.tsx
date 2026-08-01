import Link from 'next/link';
import type { ProjectSummary } from '@shared/types/project';
import ProjectCard from './ProjectCard';

type Props = {
  projects: ProjectSummary[];
  failed?: boolean;
};

function projectGridItemClass(index: number, total: number) {
  const isLast = index === total - 1;
  const isInLastPair = index >= total - 2;
  const tabletSpan = total % 2 === 1 && isLast ? 'sm:col-span-2' : 'sm:col-span-1';

  let desktopSpan = 'xl:col-span-2';
  if (total === 1 && isLast) {
    desktopSpan = 'xl:col-span-6 xl:mx-auto xl:w-full xl:max-w-[860px]';
  } else if (total % 3 === 1 && isLast) {
    desktopSpan = 'xl:col-span-6';
  } else if (total % 3 === 2 && isInLastPair) {
    desktopSpan = 'xl:col-span-3';
  }

  return `${tabletSpan} ${desktopSpan}`;
}

function GalleryState({ failed }: { failed: boolean }) {
  if (failed) {
    return (
      <div
        className="flex min-h-60 flex-col items-center justify-center rounded-[26px] border border-white/10 bg-white/[0.025] px-6 text-center"
        role="alert"
      >
        <span className="mb-4 text-2xl text-accent/70" aria-hidden>
          ↻
        </span>
        <p className="text-lg font-semibold text-white">프로젝트를 불러오지 못했어요.</p>
        <p className="mt-2 text-sm text-white/45">잠시 후 다시 시도해 주세요.</p>
        <Link
          href="/projects"
          className="mt-6 inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/75 outline-none transition hover:border-accent/60 hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313] motion-reduce:transition-none"
        >
          다시 불러오기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-60 flex-col items-center justify-center rounded-[26px] border border-dashed border-white/15 px-6 text-center">
      <span className="mb-4 text-2xl text-accent/70" aria-hidden>
        ◌
      </span>
      <p className="text-lg font-semibold text-white">첫 프로젝트를 준비하고 있어요.</p>
      <p className="mt-2 text-sm text-white/45">곧 새로운 결과물로 만나요.</p>
    </div>
  );
}

export default function ProjectsGallery({ projects, failed = false }: Props) {
  const [featuredProject, ...remainingProjects] = projects;

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-7">
        <h2 id="projects-heading" className="text-sm font-medium text-white/50">
          전체 프로젝트
        </h2>
        {!failed ? (
          <span className="text-sm tabular-nums text-white/35">
            {projects.length}개의 프로젝트
          </span>
        ) : null}
      </div>

      {failed || !featuredProject ? (
        <GalleryState failed={failed} />
      ) : (
        <div>
          <ProjectCard project={featuredProject} priority featured />

          {remainingProjects.length > 0 ? (
            <div className="mt-10 border-t border-white/10 pt-6 sm:mt-12 sm:pt-7">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-sm font-medium text-white/45">더 많은 프로젝트</h3>
                <span className="text-xs uppercase tracking-[0.18em] text-white/25">Explore</span>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-y-12 xl:grid-cols-6 xl:gap-x-8 xl:gap-y-14">
                {remainingProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className={projectGridItemClass(index, remainingProjects.length)}
                  >
                    <ProjectCard project={project} priority={index < 2} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
