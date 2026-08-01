'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ProjectSummary } from '@shared/types/project';

type Props = {
  project: ProjectSummary;
  priority?: boolean;
};

export default function ProjectCard({ project, priority = false }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth === 0) setImageFailed(true);
  }, []);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      aria-label={`${project.title} 프로젝트 자세히 보기`}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
        {project.representativeImageUrl && !imageFailed ? (
          // 아카이브 썸네일에서도 원본 전체를 보여주고 남는 영역만 검게 둔다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            src={project.representativeImageUrl}
            alt={`${project.title} 대표 이미지`}
            className="h-full w-full object-contain transition-opacity duration-200 group-hover:opacity-80 motion-reduce:transition-none"
            loading={priority ? 'eager' : 'lazy'}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-xs text-white/35">이미지 준비 중</span>
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 sm:flex motion-reduce:transition-none">
          프로젝트 보기
        </span>
      </div>

      <div className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 break-words text-sm font-semibold leading-5 text-white sm:text-base sm:leading-6">
            {project.title}
          </h2>
          <span className="shrink-0 pt-0.5 text-[11px] text-white/35">{project.cohort}기</span>
        </div>
        <p className="mt-2 hidden line-clamp-2 break-keep text-sm leading-5 text-white/55 sm:block">
          {project.summary}
        </p>
        {project.techStack.length > 0 ? (
          <p className="mt-2 hidden truncate text-xs text-white/35 sm:block">
            {project.techStack.slice(0, 4).join(' · ')}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
