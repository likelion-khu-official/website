'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { ProjectSummary } from '@shared/types/project';

const AUTOPLAY_DELAY = 5200;
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

type Props = {
  projects: ProjectSummary[];
};

type CarouselStyle = CSSProperties & {
  '--card-x': string;
  '--card-rotate': string;
  '--card-scale': string;
};

function circularDistance(index: number, activeIndex: number, length: number) {
  let distance = index - activeIndex;
  if (distance > length / 2) distance -= length;
  if (distance < -length / 2) distance += length;
  return distance;
}

function cardStyle(distance: number, length: number): CarouselStyle {
  const direction = Math.sign(distance);
  const depth = Math.abs(distance);
  const x = direction * (depth === 0 ? 0 : 53 + Math.min(depth - 1, 2) * 16);

  return {
    '--card-x': `${x}%`,
    '--card-rotate': `${direction * -52}deg`,
    '--card-scale': `${Math.max(0.66, 1 - depth * 0.11)}`,
    zIndex: length - depth,
    opacity: depth > 3 ? 0 : Math.max(0.34, 1 - depth * 0.2),
    pointerEvents: depth > 3 ? 'none' : 'auto',
  };
}

function subscribeReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}

export default function ProjectCarousel({ projects }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const autoplay = autoplayEnabled && !reducedMotion;
  const pointerStart = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const move = useCallback(
    (direction: -1 | 1) => {
      setActiveIndex((current) => (current + direction + projects.length) % projects.length);
    },
    [projects.length],
  );

  useEffect(() => {
    if (!autoplay || interacting || projects.length < 2) return;

    const timer = window.setTimeout(() => move(1), AUTOPLAY_DELAY);
    return () => window.clearTimeout(timer);
  }, [activeIndex, autoplay, interacting, move, projects.length]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointerStart.current = event.clientX;
    didSwipe.current = false;
    setInteracting(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerStart.current !== null) {
      const distance = event.clientX - pointerStart.current;
      if (Math.abs(distance) > 48) {
        didSwipe.current = true;
        move(distance > 0 ? -1 : 1);
      }
    }

    pointerStart.current = null;
    setInteracting(false);
  }

  const activeProject = projects[activeIndex];

  return (
    <div
      className="project-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="프로젝트 둘러보기"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') move(-1);
        if (event.key === 'ArrowRight') move(1);
      }}
    >
      <div
        className="project-coverflow-stage"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
          setInteracting(false);
        }}
      >
        {projects.map((project, index) => {
          const distance = circularDistance(index, activeIndex, projects.length);
          const isActive = distance === 0;

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`project-coverflow-card ${isActive ? 'is-active' : ''}`}
              style={cardStyle(distance, projects.length)}
              tabIndex={isActive ? 0 : -1}
              aria-hidden={!isActive}
              aria-label={`${project.title} 프로젝트 자세히 보기`}
              onClick={(event) => {
                if (didSwipe.current) {
                  event.preventDefault();
                  didSwipe.current = false;
                  return;
                }
                if (!isActive) {
                  event.preventDefault();
                  setActiveIndex(index);
                }
              }}
            >
              {project.representativeImageUrl ? (
                // 프로젝트 화면은 잘라내거나 늘이지 않고 업로드한 원본 비율 그대로 보여준다.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.representativeImageUrl}
                  alt={`${project.title} 대표 이미지`}
                  className="block h-full w-full object-contain"
                  loading={index < 4 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_70%_20%,rgba(255,80,0,0.3),transparent_38%),linear-gradient(145deg,#2b2b2b,#151515)]">
                  <span className="text-[clamp(64px,10vw,140px)] font-semibold text-white/10">
                    {String(project.cohort).padStart(2, '0')}
                  </span>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
              <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md sm:right-5 sm:top-5">
                {project.cohort}기
              </span>
              <span className="project-coverflow-open" aria-hidden>
                ↗
              </span>
            </Link>
          );
        })}
      </div>

      <div className="project-carousel-meta relative z-20 mx-auto flex max-w-[760px] items-start justify-between gap-5 px-1 sm:px-4">
        <div aria-live="polite" aria-atomic="true" className="min-w-0">
          <h3 className="truncate text-[clamp(22px,2.5vw,30px)] font-semibold tracking-[-0.04em] text-white">
            {activeProject.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 max-w-2xl break-keep text-sm leading-5 text-white/55">
            {activeProject.summary}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            className="project-carousel-control"
            aria-label="이전 프로젝트"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="project-carousel-control"
            aria-label="다음 프로젝트"
          >
            →
          </button>
        </div>
      </div>

      <div className="project-carousel-pagination relative z-20 mx-auto flex max-w-[760px] items-center gap-3 px-1 sm:px-4">
        <button
          type="button"
          onClick={() => setAutoplayEnabled((current) => !current)}
          className="shrink-0 text-xs font-medium text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          aria-label={autoplay ? '자동 넘김 일시정지' : '자동 넘김 재생'}
        >
          {autoplay ? 'Ⅱ' : '▶'}
        </button>
        <div className="flex min-w-0 flex-1 gap-1.5">
          {projects.map((project, index) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group h-5 flex-1 focus-visible:outline-none"
              aria-label={`${project.title} 프로젝트 보기`}
              aria-current={index === activeIndex ? 'true' : undefined}
            >
              <span className="block h-px overflow-hidden bg-white/15">
                {index === activeIndex ? (
                  <span
                    key={`${activeIndex}-${autoplay}-${interacting}`}
                    className={`project-carousel-progress block h-full bg-accent ${
                      !autoplay || interacting ? 'is-paused' : ''
                    }`}
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
