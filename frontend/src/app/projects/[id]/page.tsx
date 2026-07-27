import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProjectById } from '@/lib/projectApi';
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

  const project = await getProjectById(id, await getBaseUrl());
  if (!project) notFound();

  const startDate = formatDate(project.startDate);
  const endDate = formatDate(project.endDate);

  return (
    <main className="relative mx-auto w-full min-w-0 max-w-[1440px] overflow-hidden px-6 pb-32 pt-12 sm:px-10 lg:px-16 lg:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-240px] top-[-320px] h-[720px] w-[720px] rounded-full bg-[radial-gradient(circle,rgba(176,34,12,0.24),transparent_68%)] blur-2xl"
      />

      <Link
        href="/projects"
        className="relative inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
      >
        <span aria-hidden>←</span> 모든 프로젝트
      </Link>

      <header className="relative mt-14 grid gap-10 border-b border-white/10 pb-16 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
        <div className="min-w-0">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            {project.cohort}th project
          </p>
          <h1 className="break-words text-[clamp(48px,8vw,112px)] font-semibold leading-[0.88] tracking-[-0.065em]">
            {project.title}
          </h1>
          <p className="mt-8 max-w-3xl break-words text-lg leading-8 text-white/65 sm:break-keep sm:text-2xl sm:leading-10">
            {project.summary}
          </p>
        </div>

        <dl className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-6 text-sm sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <dt className="text-white/35">기수</dt>
            <dd className="mt-1.5 font-medium">{project.cohort}기</dd>
          </div>
          <div>
            <dt className="text-white/35">개발 기간</dt>
            <dd className="mt-1.5 break-words font-medium">
              {startDate ? `${startDate} — ${endDate ?? '진행 중'}` : '미정'}
            </dd>
          </div>
        </dl>
      </header>

      <section className="mt-14" aria-labelledby="project-images">
        <h2 id="project-images" className="sr-only">
          프로젝트 이미지
        </h2>
        {project.images.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {project.images.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-black/35"
              >
                {/* 상세에서는 4:5 원본을 자르지 않는다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={`${project.title} 프로젝트 이미지 ${index + 1}`}
                  className="h-full w-full object-contain"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[4/2] items-center justify-center rounded-[24px] border border-dashed border-white/15 text-sm text-white/35">
            등록된 이미지가 없어요.
          </div>
        )}
      </section>

      <section className="mt-20 grid gap-16 border-t border-white/10 pt-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Team</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">함께 만든 사람들</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {project.participants.map((participant) => (
              <li
                key={participant.memberId}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4"
              >
                <span className="font-medium">{participant.name}</span>
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  {participant.part}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Built with
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">기술 스택</h2>
          {project.techStack.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-2.5">
              {project.techStack.map((stack) => (
                <span
                  key={stack}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70"
                >
                  {stack}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-sm text-white/35">아직 등록된 기술 스택이 없어요.</p>
          )}

          {project.githubUrl ? (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent hover:text-white"
            >
              GitHub에서 보기 <span aria-hidden>↗</span>
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
