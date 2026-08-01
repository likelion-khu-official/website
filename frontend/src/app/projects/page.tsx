import type { Metadata } from 'next';
import ProjectsGallery from '@/components/projects/ProjectsGallery';
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
    <main className="relative mx-auto min-h-[calc(100svh-88px)] w-full min-w-0 max-w-[1440px] overflow-hidden px-5 pb-24 pt-6 sm:px-10 sm:pb-28 sm:pt-8 lg:px-16 lg:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[12%] top-[-440px] -z-0 h-[720px] w-[980px] rounded-full bg-[radial-gradient(ellipse,rgba(176,34,12,0.28),rgba(19,19,19,0)_68%)] blur-2xl"
      />

      <header className="relative z-[1] grid min-w-0 gap-5 border-b border-white/10 pb-8 sm:pb-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] lg:items-end lg:gap-16">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Project archive
          </p>
          <h1 className="break-keep text-[clamp(38px,5vw,64px)] font-semibold leading-[1.02] tracking-[-0.055em] text-white">
            우리가 만든 것들
          </h1>
        </div>
        <p className="max-w-xl break-keep text-sm leading-6 text-white/55 sm:text-base sm:leading-7 lg:justify-self-end">
          아이디어를 실제 서비스로 완성한 멋쟁이사자처럼 경희대의 프로젝트를 모았습니다.
        </p>
      </header>

      <section className="relative z-[1] mt-6 min-w-0 sm:mt-8" aria-labelledby="projects-heading">
        <ProjectsGallery projects={projects ?? []} failed={failed} />
      </section>
    </main>
  );
}
