'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectImage } from '@shared/types/project';

type Props = {
  title: string;
  images: ProjectImage[];
};

export default function ProjectImageGallery({ title, images }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(new Set());
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const suppressOpenRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    moved: boolean;
  } | null>(null);
  const hasMultipleImages = images.length > 1;
  const isExpanded = expandedIndex !== null;

  const markFailed = useCallback((index: number) => {
    setFailedIndexes((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  useEffect(() => {
    images.forEach((_, index) => {
      const image = imageRefs.current[index];
      if (image && image.complete && image.naturalWidth === 0) markFailed(index);
    });
  }, [images, markFailed]);

  const closeExpanded = useCallback(() => {
    setExpandedIndex(null);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeExpanded();
      if (event.key === 'ArrowLeft') {
        setExpandedIndex((current) => (current === null ? null : Math.max(0, current - 1)));
      }
      if (event.key === 'ArrowRight') {
        setExpandedIndex((current) =>
          current === null ? null : Math.min(images.length - 1, current + 1),
        );
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeExpanded, images.length, isExpanded]);

  function moveTo(index: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const nextIndex = Math.min(Math.max(index, 0), images.length - 1);
    viewport.scrollTo({ left: viewport.clientWidth * nextIndex, behavior: 'smooth' });
    setActiveIndex(nextIndex);
  }

  function handleScroll() {
    const viewport = viewportRef.current;
    if (!viewport || viewport.clientWidth === 0) return;

    const nextIndex = Math.min(
      images.length - 1,
      Math.max(0, Math.round(viewport.scrollLeft / viewport.clientWidth)),
    );
    setActiveIndex(nextIndex);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 8 && !drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - distance;
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    suppressOpenRef.current = drag.moved;
    dragRef.current = null;
    if (drag.moved) event.currentTarget.releasePointerCapture?.(event.pointerId);
    const width = event.currentTarget.clientWidth;
    if (width > 0) moveTo(Math.round(event.currentTarget.scrollLeft / width));
  }

  function openExpanded(index: number, trigger: HTMLButtonElement) {
    if (suppressOpenRef.current) {
      suppressOpenRef.current = false;
      return;
    }
    lastTriggerRef.current = trigger;
    setExpandedIndex(index);
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} 프로젝트 이미지`}
    >
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') moveTo(activeIndex - 1);
          if (event.key === 'ArrowRight') moveTo(activeIndex + 1);
        }}
        tabIndex={hasMultipleImages ? 0 : -1}
        className="flex aspect-[4/3] cursor-grab snap-x snap-mandatory select-none overflow-x-auto overscroll-x-contain scroll-smooth outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, index) => (
          <div
            key={`${image.url}-${index}`}
            className="flex min-w-full snap-center items-center justify-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${images.length}`}
          >
            {failedIndexes.has(index) ? (
              <p className="text-sm text-white/40">이미지를 불러오지 못했어요.</p>
            ) : (
              <button
                type="button"
                className="group/image relative flex h-full w-full cursor-zoom-in items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                aria-label={`${index + 1}번째 이미지 크게 보기`}
                onClick={(event) => openExpanded(index, event.currentTarget)}
              >
                {/* 원본 비율이 달라도 자르지 않고 하나의 프레임 안에 온전히 보여준다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={(element) => {
                    imageRefs.current[index] = element;
                  }}
                  src={image.url}
                  alt={`${title} 프로젝트 이미지 ${index + 1}`}
                  className="h-full w-full object-contain"
                  draggable={false}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  onError={() => markFailed(index)}
                />
                <span className="absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover/image:opacity-100 group-focus-visible/image:opacity-100 sm:inline-flex motion-reduce:transition-none">
                  <span aria-hidden>↗</span> 크게 보기
                </span>
              </button>
            )}
          </div>
        ))}
      </div>

      {hasMultipleImages ? (
        <>
          <span
            className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium tabular-nums text-white"
            aria-live="polite"
          >
            {activeIndex + 1} / {images.length}
          </span>

          <button
            type="button"
            onClick={() => moveTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="이전 이미지"
            className="group/previous absolute inset-y-0 left-0 hidden w-24 items-center justify-start bg-gradient-to-r from-black/35 to-transparent pl-4 text-white outline-none transition-opacity hover:from-black/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:pointer-events-none disabled:opacity-0 sm:flex motion-reduce:transition-none"
          >
            <span
              aria-hidden
              className="inline-flex size-14 items-center justify-center rounded-full border border-white/20 bg-black/65 text-3xl shadow-lg transition-transform group-hover/previous:scale-105 motion-reduce:transition-none"
            >
              ‹
            </span>
          </button>
          <button
            type="button"
            onClick={() => moveTo(activeIndex + 1)}
            disabled={activeIndex === images.length - 1}
            aria-label="다음 이미지"
            className="group/next absolute inset-y-0 right-0 hidden w-24 items-center justify-end bg-gradient-to-l from-black/35 to-transparent pr-4 text-white outline-none transition-opacity hover:from-black/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:pointer-events-none disabled:opacity-0 sm:flex motion-reduce:transition-none"
          >
            <span
              aria-hidden
              className="inline-flex size-14 items-center justify-center rounded-full border border-white/20 bg-black/65 text-3xl shadow-lg transition-transform group-hover/next:scale-105 motion-reduce:transition-none"
            >
              ›
            </span>
          </button>

          {activeIndex === 0 ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1.5 text-xs text-white/80 sm:hidden">
              좌우로 넘겨보세요 <span aria-hidden>↔</span>
            </span>
          ) : null}

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
            {images.length <= 8
              ? images.map((image, index) => (
                  <span
                    key={`${image.url}-dot`}
                    className={`h-1.5 rounded-full transition-[width,background-color] ${
                      index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/45'
                    }`}
                  />
                ))
              : null}
          </div>
        </>
      ) : null}

      {expandedIndex !== null
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-label={`${title} 이미지 크게 보기`}
            >
              <button
                type="button"
                tabIndex={-1}
                aria-label="배경을 눌러 크게보기 닫기"
                className="absolute inset-0 cursor-zoom-out"
                onClick={closeExpanded}
              />

              <span className="absolute left-4 top-4 z-20 rounded-full bg-white/10 px-3 py-2 text-xs font-medium tabular-nums text-white sm:left-6 sm:top-6">
                {expandedIndex + 1} / {images.length}
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeExpanded}
                aria-label="크게보기 닫기"
                className="absolute right-4 top-4 z-20 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6 motion-reduce:transition-none"
              >
                <span aria-hidden>×</span>
              </button>

              {failedIndexes.has(expandedIndex) ? (
                <p className="relative z-10 text-sm text-white/50">이미지를 불러오지 못했어요.</p>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[expandedIndex].url}
                  alt={`${title} 프로젝트 이미지 ${expandedIndex + 1} 크게 보기`}
                  className="relative z-10 max-h-[calc(100svh-8rem)] max-w-[calc(100vw-2rem)] object-contain sm:max-w-[calc(100vw-8rem)]"
                  draggable={false}
                  onError={() => markFailed(expandedIndex)}
                />
              )}

              {hasMultipleImages ? (
                <>
                  <button
                    type="button"
                    onClick={() => setExpandedIndex((current) => Math.max(0, (current ?? 0) - 1))}
                    disabled={expandedIndex === 0}
                    aria-label="크게보기 이전 이미지"
                    className="absolute left-3 top-1/2 z-20 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-20 sm:left-6 sm:size-14 motion-reduce:transition-none"
                  >
                    <span aria-hidden>‹</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedIndex((current) =>
                        Math.min(images.length - 1, (current ?? 0) + 1),
                      )
                    }
                    disabled={expandedIndex === images.length - 1}
                    aria-label="크게보기 다음 이미지"
                    className="absolute right-3 top-1/2 z-20 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-20 sm:right-6 sm:size-14 motion-reduce:transition-none"
                  >
                    <span aria-hidden>›</span>
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
