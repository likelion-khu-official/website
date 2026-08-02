import type { Metadata } from 'next';
import ProjectsGallery from '@/components/projects/ProjectsGallery';
import BackLink from '@/components/BackLink';
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
    <main className="mx-auto min-h-[calc(100svh-88px)] w-full max-w-6xl px-4 pb-24 pt-4 sm:px-8 sm:pt-6 lg:px-10">
      <div className="mb-5 sm:mb-7">
        <BackLink href="/#project" />
      </div>
      <header className="mb-7 flex items-end justify-between gap-6 border-b border-white/15 pb-6 sm:mb-9 sm:pb-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Project archive
          </p>
          <h1 className="mt-2 max-w-2xl break-keep text-[32px] font-semibold leading-[1.12] tracking-[-0.045em] text-white sm:text-[44px]">
            아이디어를 현실로 만든 프로젝트
          </h1>
        </div>
        {!failed ? (
          <div className="hidden shrink-0 items-baseline gap-2 sm:flex" aria-label={`${projects?.length ?? 0}개의 프로젝트`}>
            <span className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-white">
              {String(projects?.length ?? 0).padStart(2, '0')}
            </span>
            <span className="text-xs uppercase tracking-[0.14em] text-white/35">Projects</span>
          </div>
        ) : null}
      </header>

      <section aria-labelledby="projects-heading">
        <ProjectsGallery projects={projects ?? []} failed={failed} />
      </section>
    </main>
  );
}
