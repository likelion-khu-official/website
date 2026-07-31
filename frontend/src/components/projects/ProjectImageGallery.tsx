'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectImage } from '@shared/types/project';

type Props = {
  title: string;
  images: ProjectImage[];
};

export default function ProjectImageGallery({ title, images }: Props) {
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(new Set());
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  const markFailed = useCallback((index: number) => {
    setFailedIndexes((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  // 첫 번째 이미지는 loading="eager"라 SSR HTML이 그려지자마자 요청이 시작돼,
  // 하이드레이션이 onError 리스너를 붙이기 전에 실패가 끝나버리면 이벤트가
  // 유실된다(error는 버블링 안 함). 마운트 시 네이티브 로드 상태를 한 번 더
  // 확인해 놓친 실패를 보정한다.
  useEffect(() => {
    images.forEach((_, index) => {
      const img = imageRefs.current[index];
      if (img && img.complete && img.naturalWidth === 0) {
        markFailed(index);
      }
    });
  }, [images, markFailed]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {images.map((image, index) => (
        <div
          key={`${image.url}-${index}`}
          className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-black/35"
        >
          {failedIndexes.has(index) ? null : (
            // 상세에서는 4:5 원본을 자르지 않는다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={(el) => {
                imageRefs.current[index] = el;
              }}
              src={image.url}
              alt={`${title} 프로젝트 이미지 ${index + 1}`}
              className="h-full w-full object-contain"
              loading={index === 0 ? 'eager' : 'lazy'}
              onError={() => markFailed(index)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
