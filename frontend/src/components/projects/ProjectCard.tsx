'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ProjectSummary } from '@shared/types/project';

type Props = {
  project: ProjectSummary;
  priority?: boolean;
  compact?: boolean;
};

export default function ProjectCard({ project, priority = false, compact = false }: Props) {
  const [imgError, setImgError] = useState(false);
  const [lastImageUrl, setLastImageUrl] = useState(project.representativeImageUrl);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (project.representativeImageUrl !== lastImageUrl) {
    setLastImageUrl(project.representativeImageUrl);
    setImgError(false);
  }

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
    <Link
      href={`/projects/${project.id}`}
      className="group flex min-w-0 flex-col focus-visible:outline-none"
      aria-label={`${project.title} 프로젝트 자세히 보기`}
    >
      <div
        className={`relative overflow-hidden rounded-[22px] border border-white/10 bg-[#202020] transition duration-500 group-hover:-translate-y-1 group-hover:border-white/25 group-hover:shadow-[0_26px_70px_rgba(0,0,0,0.42)] group-focus-visible:ring-2 group-focus-visible:ring-accent ${
          compact ? 'aspect-[4/3]' : 'aspect-[4/5]'
        }`}
      >
        {project.representativeImageUrl && !imgError ? (
          // 프로젝트 이미지는 OCI URL이라 Next 이미지 도메인을 고정하지 않는다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={project.representativeImageUrl}
            alt={`${project.title} 대표 이미지`}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
            loading={priority ? 'eager' : 'lazy'}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_75%_20%,rgba(255,80,0,0.24),transparent_36%),linear-gradient(145deg,#272727,#181818)] p-6">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
              LIKELION KHU
            </span>
            <span className="text-5xl font-semibold text-white/15" aria-hidden>
              {String(project.cohort).padStart(2, '0')}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
          {project.cohort}기
        </span>
      </div>

      <div className={compact ? 'pt-4' : 'pt-5'}>
        <div className="flex items-start justify-between gap-4">
          <h3
            className={`min-w-0 truncate font-semibold tracking-[-0.03em] text-white ${
              compact ? 'text-xl' : 'text-2xl'
            }`}
          >
            {project.title}
          </h3>
          <span
            aria-hidden
            className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm text-white/60 transition group-hover:border-accent group-hover:bg-accent group-hover:text-white"
          >
            ↗
          </span>
        </div>
        <p
          className={`mt-2 line-clamp-2 break-keep text-white/55 ${
            compact ? 'text-sm leading-6' : 'text-[15px] leading-6'
          }`}
        >
          {project.summary}
        </p>
        {project.techStack.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.techStack.slice(0, 4).map((stack) => (
              <span
                key={stack}
                className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-white/65"
              >
                {stack}
              </span>
            ))}
            {project.techStack.length > 4 ? (
              <span className="px-1 py-1 text-[11px] text-white/40">
                +{project.techStack.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
