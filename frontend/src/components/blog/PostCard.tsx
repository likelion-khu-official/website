'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PostSummary } from '@shared/types/feed';
import PostAuthor from './PostAuthor';

type Props = {
  post: PostSummary;
  priority?: boolean;
};

function PostImage({
  post,
  priority,
}: {
  post: PostSummary;
  priority: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const [lastThumbnailUrl, setLastThumbnailUrl] = useState(post.thumbnailUrl);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (post.thumbnailUrl !== lastThumbnailUrl) {
    setLastThumbnailUrl(post.thumbnailUrl);
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
  }, [post.thumbnailUrl]);

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-[#202020]">
      {post.thumbnailUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={post.thumbnailUrl}
          alt={`${post.title} 대표 이미지`}
          loading={priority ? 'eager' : 'lazy'}
          className="h-full w-full object-cover transition duration-300 group-hover:opacity-90"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_75%_20%,rgba(255,80,0,0.28),transparent_35%),linear-gradient(145deg,#272727,#171717)] p-3 sm:p-4">
          <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:text-[10px]">
            LIKELION KHU
          </span>
          <span
            aria-hidden
            className="text-3xl font-semibold tracking-[-0.06em] text-white/10 sm:text-4xl"
          >
            BLOG
          </span>
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, priority = false }: Props) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      aria-label={`${post.title} 글 읽기`}
      className="group grid min-w-0 grid-cols-[104px_minmax(0,1fr)] items-center gap-4 border-t border-white/10 py-5 outline-none first:border-t-0 focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-accent sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-6 sm:py-7 lg:grid-cols-[240px_minmax(0,1fr)_auto] lg:gap-8"
    >
      <PostImage post={post} priority={priority} />

      <div className="min-w-0">
        <h2 className="line-clamp-2 min-w-0 break-keep text-[16px] font-semibold leading-[1.35] tracking-[-0.035em] text-white transition-colors group-hover:text-accent sm:text-2xl">
          {post.title}
        </h2>
        {post.summary ? (
          <p className="mt-2 hidden line-clamp-2 max-w-2xl break-keep text-sm leading-6 text-white/45 sm:block">
            {post.summary}
          </p>
        ) : null}
        <div className="mt-3 sm:mt-4">
          <PostAuthor post={post} compact />
        </div>
      </div>
      <span
        aria-hidden
        className="hidden text-xl text-white/25 transition-[color,transform] group-hover:translate-x-1 group-hover:text-accent sm:block"
      >
        →
      </span>
    </Link>
  );
}
