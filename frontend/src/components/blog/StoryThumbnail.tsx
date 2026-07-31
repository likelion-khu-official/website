'use client';

import { useEffect, useRef, useState } from 'react';
import type { PostSummary } from '@shared/types/feed';

export default function StoryThumbnail({ post }: { post: PostSummary }) {
  const [imgError, setImgError] = useState(false);
  const [lastThumbnailUrl, setLastThumbnailUrl] = useState(post.thumbnailUrl);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (post.thumbnailUrl !== lastThumbnailUrl) {
    setLastThumbnailUrl(post.thumbnailUrl);
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
  }, [post.thumbnailUrl]);

  return (
    <div className="aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-[#202020]">
      {post.thumbnailUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={post.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full items-end bg-[radial-gradient(circle_at_75%_20%,rgba(255,80,0,0.26),transparent_38%),linear-gradient(145deg,#272727,#171717)] p-3 sm:p-4">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-white/25 sm:text-xs">STORY</span>
        </div>
      )}
    </div>
  );
}
