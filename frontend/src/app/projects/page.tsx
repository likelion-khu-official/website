import type { Metadata } from 'next';
import ProjectCard from '@/components/projects/ProjectCard';
import { getProjects } from '@/lib/projectApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

export const metadata: Metadata = {
  title: '프로젝트 — 멋쟁이사자처럼 경희대',
  description: '멋쟁이사자처럼 경희대 멤버들이 직접 기획하고 개발한 프로젝트를 만나보세요.',
};

export default async function ProjectsPage() {
  let projects = null;
  let failed = false;

  try {
    projects = await getProjects(await getBaseUrl());
  } catch {
    failed = true;
  }

  return (
    <main className="relative mx-auto min-h-[calc(100svh-88px)] w-full min-w-0 max-w-[1440px] overflow-hidden px-5 pb-24 pt-12 sm:px-10 sm:pb-28 sm:pt-14 lg:px-16 lg:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-400px] -z-0 h-[780px] w-[1050px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(176,34,12,0.33),rgba(19,19,19,0)_68%)] blur-2xl"
      />

      <header className="relative z-[1] min-w-0 max-w-3xl">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Our projects
        </p>
        <h1 className="break-keep break-words text-[clamp(42px,7vw,88px)] font-semibold leading-[0.98] tracking-[-0.065em]">
          아이디어를
          <br />
          세상에 꺼내는 사람들
        </h1>
        <p className="mt-7 max-w-xl break-keep break-words text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
          문제를 발견하고, 팀을 만들고, 실제로 작동하는 서비스까지. 멋쟁이사자처럼
          경희대가 함께 완성한 결과물입니다.
        </p>
      </header>

      <section className="relative z-[1] mt-20 min-w-0 border-t border-white/10 pt-8 sm:mt-28">
        <div className="mb-9 flex items-end justify-between">
          <h2 className="text-sm font-medium text-white/45">전체 프로젝트</h2>
          {!failed && projects ? (
            <span className="text-sm tabular-nums text-white/35">{projects.length} projects</span>
          ) : null}
        </div>

        {failed ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025] px-6 text-center">
            <p className="text-lg font-semibold text-white">프로젝트를 불러오지 못했어요.</p>
            <p className="mt-2 text-sm text-white/45">잠시 후 페이지를 다시 열어주세요.</p>
          </div>
        ) : projects?.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 text-center">
            <span className="mb-5 text-3xl text-accent/70" aria-hidden>
              ◌
            </span>
            <p className="text-lg font-semibold text-white">첫 프로젝트를 준비하고 있어요.</p>
            <p className="mt-2 text-sm text-white/45">곧 새로운 결과물로 만나요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8 xl:gap-y-20">
            {projects?.map((project, index) => (
              <ProjectCard key={project.id} project={project} priority={index < 3} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
