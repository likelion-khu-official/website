'use client';

import { useEffect, useRef, useState } from 'react';

export default function PostThumbnail({ src }: { src: string }) {
  const [imgError, setImgError] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (src !== lastSrc) {
    setLastSrc(src);
    setImgError(false);
  }

  // 이 img는 loading 속성이 없어(=브라우저 기본값 eager) 하이드레이션 전에 요청이
  // 시작될 수 있다. error는 버블링 안 하는 이벤트라 그 전에 실패하면 onError가
  // 유실되므로, 마운트 시 네이티브 로드 상태를 한 번 더 확인해 놓친 실패를 보정한다.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImgError(true);
    }
  }, [src]);

  if (imgError) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt=""
      className="mb-8 aspect-[16/9] w-full rounded-2xl object-cover"
      onError={() => setImgError(true)}
    />
  );
}
