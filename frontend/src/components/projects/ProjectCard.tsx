'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ProjectSummary } from '@shared/types/project';

type Props = {
  project: ProjectSummary;
  priority?: boolean;
  featured?: boolean;
};

function ProjectVisual({
  project,
  priority,
  featured,
}: {
  project: ProjectSummary;
  priority: boolean;
  featured: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // eager 로딩(priority)일 때 SSR HTML이 그려지자마자 요청이 시작돼, 하이드레이션이
  // onError 리스너를 붙이기 전에 실패가 끝나버리면 이벤트가 유실된다(error는 버블링
  // 안 함). 마운트 시 네이티브 로드 상태를 한 번 더 확인해 놓친 실패를 보정한다.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImgError(true);
    }
  }, [project.representativeImageUrl]);

  return (
    <div
      className={`relative overflow-hidden bg-[#0c0c0c] ${
        featured
          ? 'aspect-[16/10] border-b border-white/10 lg:aspect-auto lg:min-h-[390px] lg:border-b-0 lg:border-r'
          : 'aspect-[16/10] rounded-[20px] border border-white/10'
      }`}
    >
      {project.representativeImageUrl && !imgError ? (
        // 프로젝트 이미지는 OCI URL이라 Next 이미지 도메인을 고정하지 않는다.
        // 서비스 화면이 잘리지 않게 일관된 가로 프레임 안에 원본 전체를 보여준다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={project.representativeImageUrl}
          alt={`${project.title} 대표 이미지`}
          className="h-full w-full object-contain transition duration-700 ease-out group-hover:scale-[1.015] motion-reduce:transform-none motion-reduce:transition-none"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_75%_20%,rgba(255,80,0,0.24),transparent_36%),linear-gradient(145deg,#272727,#181818)] p-6 sm:p-8">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            LIKELION KHU
          </span>
          <span
            className={`font-semibold tracking-[-0.06em] text-white/15 ${
              featured ? 'text-7xl sm:text-8xl' : 'text-6xl'
            }`}
            aria-hidden
          >
            {String(project.cohort).padStart(2, '0')}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
    </div>
  );
}

function ProjectTechStack({ techStack }: { techStack: string[] }) {
  if (techStack.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-wrap gap-2" aria-label="기술 스택">
      {techStack.slice(0, 4).map((stack) => (
        <span
          key={stack}
          className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-white/60"
        >
          {stack}
        </span>
      ))}
      {techStack.length > 4 ? (
        <span className="px-1 py-1 text-[11px] text-white/40">+{techStack.length - 4}</span>
      ) : null}
    </div>
  );
}

export default function ProjectCard({ project, priority = false, featured = false }: Props) {
  if (featured) {
    return (
      <Link
        href={`/projects/${project.id}`}
        className="group grid min-w-0 overflow-hidden rounded-[26px] border border-white/10 bg-[#191919] outline-none transition duration-500 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_28px_90px_rgba(0,0,0,0.38)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-[#131313] active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none lg:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.75fr)]"
        aria-label={`${project.title} 프로젝트 자세히 보기`}
      >
        <ProjectVisual
          key={`${project.id}:${project.representativeImageUrl ?? 'none'}`}
          project={project}
          priority={priority}
          featured
        />

        <div className="flex min-w-0 flex-col p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              최근 프로젝트 · {project.cohort}기
            </p>
            <span
              aria-hidden
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-base text-white/60 transition group-hover:border-accent group-hover:bg-accent group-hover:text-white motion-reduce:transition-none"
            >
              ↗
            </span>
          </div>

          <div className="mt-9 lg:mt-auto">
            <h2 className="break-words text-[clamp(30px,3.5vw,50px)] font-semibold leading-[1.06] tracking-[-0.05em] text-white">
              {project.title}
            </h2>
            <p className="mt-5 line-clamp-3 break-keep text-[15px] leading-7 text-white/55 sm:text-base">
              {project.summary}
            </p>
          </div>

          {project.techStack.length > 0 ? (
            <div className="mt-8 border-t border-white/10 pt-6">
              <ProjectTechStack techStack={project.techStack} />
            </div>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex h-full min-w-0 flex-col rounded-[20px] outline-none transition duration-500 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-[#131313] active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none"
      aria-label={`${project.title} 프로젝트 자세히 보기`}
    >
      <div className="transition duration-500 group-hover:border-white/25 group-hover:shadow-[0_24px_64px_rgba(0,0,0,0.36)] motion-reduce:transition-none">
        <ProjectVisual
          key={`${project.id}:${project.representativeImageUrl ?? 'none'}`}
          project={project}
          priority={priority}
          featured={false}
        />
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="min-w-0 break-words text-[22px] font-semibold leading-[1.2] tracking-[-0.035em] text-white">
            {project.title}
          </h3>
          <span
            aria-hidden
            className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm text-white/60 transition group-hover:border-accent group-hover:bg-accent group-hover:text-white motion-reduce:transition-none"
          >
            ↗
          </span>
        </div>
        <p className="mt-3 line-clamp-3 break-keep text-sm leading-6 text-white/50">
          {project.summary}
        </p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
          <span className="text-xs font-medium text-white/35">{project.cohort}기</span>
          <ProjectTechStack techStack={project.techStack} />
        </div>
      </div>
    </Link>
  );
}
