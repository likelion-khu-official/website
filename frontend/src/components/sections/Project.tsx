import Link from 'next/link';
import ProjectCarousel from '@/components/projects/ProjectCarousel';
import { getProjects } from '@/lib/projectApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

export default async function Project() {
  let projects = null;

  try {
    projects = await getProjects(await getBaseUrl(), 10);
  } catch {
    // 랜딩 전체를 깨지 않고 이 섹션 안에서만 재시도 안내를 보여준다.
  }

  return (
    <section
      id="project"
      className="project-section relative flex h-[100svh] flex-col justify-center overflow-hidden bg-[#131313] px-5 sm:px-10 lg:px-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-460px] h-[900px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(176,34,12,0.36),rgba(19,19,19,0)_68%)] blur-2xl"
      />

      <div className="project-section-inner relative mx-auto w-full max-w-[1440px]">
        <div className="project-section-header scroll-reveal grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Our projects
            </p>
            <h2 className="mt-3 max-w-4xl break-keep text-[clamp(32px,4.4vw,60px)] font-semibold leading-[1.14] tracking-[-0.055em] text-white">
              아이디어부터 서비스까지
            </h2>
            <p className="mt-4 max-w-3xl break-keep text-sm leading-6 text-white/50 sm:text-base">
              아이디어 대회 기획부터 직접 개발한 서비스까지, 멋쟁이사자처럼 경희대
              멤버들이 함께 만든 프로젝트를 소개합니다.
            </p>
          </div>
          <Link
            href="/projects"
            className="group inline-flex min-h-11 w-fit items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[12px] font-semibold text-white/70 outline-none transition-colors hover:border-accent/50 hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            모든 프로젝트
            <span aria-hidden className="text-base leading-none text-accent transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        {projects === null ? (
          <div className="mt-10 flex min-h-64 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025] px-6 text-center">
            <p className="text-sm text-white/45">프로젝트를 불러오지 못했어요. 잠시 후 다시 만나요.</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-10 flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 text-center">
            <p className="text-lg font-semibold text-white">첫 프로젝트를 준비하고 있어요.</p>
            <p className="mt-2 text-sm text-white/40">곧 실제 결과물로 이 공간을 채울게요.</p>
          </div>
        ) : (
          <div className="project-carousel-shell scroll-reveal" style={{ '--reveal-y': '28px' } as React.CSSProperties}>
            <ProjectCarousel projects={projects} />
          </div>
        )}
      </div>
    </section>
  );
}
