'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PostSummary } from '@shared/types/feed';
import PostAuthor from './PostAuthor';

type Props = {
  post: PostSummary;
  featured?: boolean;
  priority?: boolean;
};

function PostImage({
  post,
  priority,
  featured,
}: {
  post: PostSummary;
  priority: boolean;
  featured: boolean;
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
    <div
      className={`relative overflow-hidden bg-[#202020] ${
        featured
          ? 'aspect-[16/10] border-b border-white/10 lg:aspect-auto lg:min-h-[430px] lg:border-b-0 lg:border-r'
          : 'aspect-[16/10] rounded-[22px] border border-white/10'
      }`}
    >
      {post.thumbnailUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={post.thumbnailUrl}
          alt={`${post.title} 대표 이미지`}
          loading={priority ? 'eager' : 'lazy'}
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_75%_20%,rgba(255,80,0,0.28),transparent_35%),linear-gradient(145deg,#272727,#171717)] p-6 sm:p-8">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            LIKELION KHU
          </span>
          <span
            aria-hidden
            className={`font-semibold tracking-[-0.06em] text-white/10 ${
              featured ? 'text-7xl sm:text-8xl' : 'text-6xl'
            }`}
          >
            STORY
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}

export default function PostCard({ post, featured = false, priority = false }: Props) {
  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        aria-label={`${post.title} 글 읽기`}
        className="group grid min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#191919] outline-none transition duration-500 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_28px_90px_rgba(0,0,0,0.38)] focus-visible:ring-2 focus-visible:ring-accent lg:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.75fr)]"
      >
        <PostImage post={post} priority={priority} featured />

        <div className="flex min-w-0 flex-col p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Latest story
            </p>
            <span
              aria-hidden
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-base text-white/60 transition group-hover:border-accent group-hover:bg-accent group-hover:text-white"
            >
              ↗
            </span>
          </div>

          <div className="mt-8 lg:mt-auto">
            <h2 className="break-keep text-[clamp(28px,3vw,46px)] font-semibold leading-[1.08] tracking-[-0.045em] text-white">
              {post.title}
            </h2>
            {post.summary ? (
              <p className="mt-5 line-clamp-3 break-keep text-[15px] leading-7 text-white/50 sm:text-base">
                {post.summary}
              </p>
            ) : null}
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <PostAuthor post={post} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      aria-label={`${post.title} 글 읽기`}
      className="group flex h-full min-w-0 flex-col outline-none focus-visible:rounded-[22px] focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_22px_60px_rgba(0,0,0,0.32)]">
        <PostImage post={post} priority={priority} featured={false} />
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="line-clamp-2 min-w-0 break-keep text-[22px] font-semibold leading-[1.25] tracking-[-0.035em] text-white">
            {post.title}
          </h2>
          <span
            aria-hidden
            className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm text-white/50 transition group-hover:border-accent group-hover:bg-accent group-hover:text-white"
          >
            ↗
          </span>
        </div>
        {post.summary ? (
          <p className="mt-3 line-clamp-2 break-keep text-sm leading-6 text-white/45">
            {post.summary}
          </p>
        ) : null}
        <div className="mt-auto pt-6">
          <PostAuthor post={post} compact />
        </div>
      </div>
    </Link>
  );
}
