import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ProjectSummary } from '@shared/types/project';
import ProjectImageGallery from '@/components/projects/ProjectImageGallery';
import ProjectMakerCard from '@/components/projects/ProjectMakerCard';
import BackLink from '@/components/BackLink';
import TrackedAnalyticsLink from '@/components/analytics/TrackedAnalyticsLink';
import { getProjectById, getProjects } from '@/lib/projectApi';
import { getMembers } from '@/lib/rosterApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

type Props = {
  params: Promise<{ id: string }>;
};

function parseProjectId(rawId: string) {
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function ProjectPreview({
  project,
  direction,
}: {
  project: ProjectSummary;
  direction: 'previous' | 'next';
}) {
  const isPrevious = direction === 'previous';

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-center gap-4 rounded-xl border border-white/10 p-3 outline-none transition-colors hover:border-white/25 hover:bg-white/[0.025] focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none sm:grid-cols-[104px_minmax(0,1fr)]"
      aria-label={`${isPrevious ? '이전' : '다음'} 프로젝트: ${project.title}`}
    >
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[#0d0d0d]">
        {project.representativeImageUrl ? (
          // 목록의 원본 이미지를 작은 미리보기에서도 자르지 않는다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.representativeImageUrl}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-white/30">{project.cohort}기</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/40">{isPrevious ? '← 이전 프로젝트' : '다음 프로젝트 →'}</p>
        <p className="mt-1.5 truncate font-semibold text-white transition-colors group-hover:text-accent motion-reduce:transition-none">
          {project.title}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-white/45">{project.summary}</p>
      </div>
    </Link>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseProjectId((await params).id);
  if (!id) return { title: '프로젝트를 찾을 수 없어요 — 멋쟁이사자처럼 경희대' };

  const project = await getProjectById(id, await getBaseUrl()).catch(() => null);
  if (!project) return { title: '프로젝트를 찾을 수 없어요 — 멋쟁이사자처럼 경희대' };

  const representative = project.images.find((image) => image.representative)?.url;
  return {
    title: `${project.title} — 멋쟁이사자처럼 경희대`,
    description: project.summary,
    openGraph: {
      title: project.title,
      description: project.summary,
      type: 'website',
      images: representative ? [{ url: representative }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.summary,
      images: representative ? [representative] : undefined,
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const id = parseProjectId((await params).id);
  if (!id) notFound();

  const baseUrl = await getBaseUrl();
  const [project, projects, members] = await Promise.all([
    getProjectById(id, baseUrl),
    getProjects(baseUrl).catch(() => []),
    getMembers(baseUrl).catch(() => []),
  ]);
  if (!project) notFound();

  const startDate = formatDate(project.startDate);
  const endDate = formatDate(project.endDate);
  const period = startDate ? `${startDate} – ${endDate ?? '진행 중'}` : null;
  const hasLinksOrStack = project.techStack.length > 0 || Boolean(project.githubUrl);
  const projectIndex = projects.findIndex((item) => item.id === project.id);
  const previousProject = projectIndex > 0 ? projects[projectIndex - 1] : null;
  const nextProject = projectIndex >= 0 ? (projects[projectIndex + 1] ?? null) : null;
  const memberById = new Map(members.map((member) => [member.id, member]));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-8 sm:pt-10 lg:px-10">
      <BackLink href="/projects">프로젝트 목록</BackLink>

      <div className="mt-4 grid gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)] lg:items-start lg:gap-12 xl:gap-16">
        <section className="min-w-0 lg:sticky lg:top-24" aria-labelledby="project-images">
          <h2 id="project-images" className="sr-only">
            프로젝트 이미지
          </h2>
          {project.images.length > 0 ? (
            <ProjectImageGallery title={project.title} images={project.images} />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-white/10 bg-black text-sm text-white/40">
              등록된 이미지가 없어요.
            </div>
          )}
        </section>

        <article className="min-w-0 lg:pt-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/50">
            <span>{project.cohort}기</span>
            {period ? (
              <>
                <span aria-hidden className="text-white/20">·</span>
                <span>{period}</span>
              </>
            ) : null}
          </div>

          <h1 className="mt-3 break-words text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-[44px]">
            {project.title}
          </h1>
          <p className="mt-4 break-keep break-words text-base leading-7 text-white/70 sm:text-lg sm:leading-8 lg:text-base lg:leading-7 xl:text-lg xl:leading-8">
            {project.summary}
          </p>

          <section className="mt-8 border-t border-white/15 pt-5" aria-labelledby="project-makers">
            <div className="flex items-baseline gap-2">
              <h2 id="project-makers" className="text-sm font-semibold text-white">
                만든 사람
              </h2>
              <span className="text-xs text-white/40">{project.participants.length}</span>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1">
              {project.participants.map((participant) => (
                <ProjectMakerCard
                  key={participant.memberId}
                  participant={participant}
                  member={memberById.get(participant.memberId)}
                />
              ))}
            </ul>
          </section>

          {hasLinksOrStack ? (
            <section className="mt-8 border-t border-white/15 pt-5" aria-labelledby="project-info">
              <h2 id="project-info" className="text-sm font-semibold text-white">
                프로젝트 정보
              </h2>
              {project.techStack.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <p className="text-xs font-medium text-white/40">기술</p>
                  <p className="break-words text-sm leading-6 text-white/70">
                    {project.techStack.join(' · ')}
                  </p>
                </div>
              ) : null}
              {project.githubUrl ? (
                <TrackedAnalyticsLink
                  href={project.githubUrl}
                  analyticsKey="PROJECT_GITHUB_PROJECT_DETAIL"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-medium text-white outline-none transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
                >
                  GitHub에서 보기 <span aria-hidden>↗</span>
                </TrackedAnalyticsLink>
              ) : null}
            </section>
          ) : null}
        </article>
      </div>

      {previousProject || nextProject ? (
        <nav className="mt-14 border-t border-white/15 pt-6 sm:mt-16" aria-label="다른 프로젝트">
          <div className="grid gap-3 sm:grid-cols-2">
            {previousProject ? (
              <ProjectPreview project={previousProject} direction="previous" />
            ) : (
              <div className="hidden sm:block" />
            )}
            {nextProject ? <ProjectPreview project={nextProject} direction="next" /> : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
