import type { Metadata } from 'next';
import { getPosts } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';
import PostCard from '@/components/blog/PostCard';
import Pagination from '@/components/blog/Pagination';

export const metadata: Metadata = {
  title: '블로그 — 멋쟁이사자처럼 경희대',
  description: '프로젝트와 스터디에서 배운 기술과 경험을 나누는 블로그입니다.',
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const parsed = Number(pageParam);
  const page = Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;

  const baseUrl = await getBaseUrl();
  const { content, number, totalElements, totalPages, first, last } = await getPosts(
    page,
    baseUrl,
  );

  return (
    <main className="mx-auto min-h-[calc(100svh-88px)] w-full min-w-0 max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pb-28 sm:pt-14 lg:px-10 lg:pt-16">
      <header className="flex min-w-0 items-end justify-between gap-8 border-b border-white/12 pb-8 sm:pb-10">
        <div className="min-w-0">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            Blog
          </p>
          <h1 className="max-w-3xl break-keep text-[clamp(32px,5vw,58px)] font-semibold leading-[1.08] tracking-[-0.05em] text-white">
            블로그
          </h1>
          <p className="mt-4 max-w-xl break-keep text-sm leading-6 text-white/48 sm:text-[15px]">
            프로젝트와 스터디에서 배운 기술과 경험을 나눕니다
          </p>
        </div>
        <p className="hidden shrink-0 pb-1 text-xs uppercase tracking-[0.18em] text-white/30 sm:block">
          글 {totalElements}개
        </p>
      </header>

      <section className="mt-5 min-w-0 sm:mt-7">
        {content.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 text-center">
            <span className="mb-5 text-3xl text-accent/70" aria-hidden>
              ◌
            </span>
            <p className="text-lg font-semibold text-white">아직 게시된 글이 없어요.</p>
            <p className="mt-2 text-sm text-white/45">곧 멤버들의 첫 블로그 글을 만날 수 있어요.</p>
          </div>
        ) : (
          <div className="border-b border-white/10">
            {content.map((post, index) => (
              <PostCard key={post.id} post={post} priority={index < 3} />
            ))}
          </div>
        )}

        <Pagination page={number} totalPages={totalPages} first={first} last={last} />
      </section>
    </main>
  );
}
